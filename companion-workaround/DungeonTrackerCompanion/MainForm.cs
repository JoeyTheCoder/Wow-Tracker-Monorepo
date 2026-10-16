using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SapphirixPartyPlannerCompanion;

internal sealed class MainForm : Form
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    private readonly TextBox _gameFolder = new() { Width = 520 };
    private readonly TextBox _endpoint = new() { Width = 520, PlaceholderText = "https://your-site.example/api/companion/snapshot" };
    private readonly TextBox _token = new() { Width = 520, UseSystemPasswordChar = true };
    private readonly Label _status = new() { AutoSize = true, Text = "Choose your WoW client folder and sync settings." };
    private readonly TextBox _log = new() { Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, Width = 700, Height = 170 };
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 10_000 };
    private readonly Dictionary<string, string> _uploadedFingerprints = new(StringComparer.OrdinalIgnoreCase);
    private bool _syncing;

    public MainForm()
    {
        Text = "Sapphirix Party Planner Companion";
        Width = 760;
        Height = 520;
        MinimumSize = new Size(760, 520);
        StartPosition = FormStartPosition.CenterScreen;

        var content = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoScroll = true,
            Padding = new Padding(18)
        };
        Controls.Add(content);

        content.Controls.Add(new Label
        {
            AutoSize = true,
            MaximumSize = new Size(690, 0),
            Text = "Select your WoW Forever client folder. The companion installs the bundled Sapphirix Party Planner addon, watches character snapshots, and syncs them to your party. WoW writes new data after /reload or logout."
        });
        content.Controls.Add(new Label { AutoSize = true, Text = "WoW Forever client folder (contains Interface and WTF):" });

        var folderRow = new FlowLayoutPanel { AutoSize = true, WrapContents = false, Width = 700 };
        folderRow.Controls.Add(_gameFolder);
        var browse = new Button { Text = "Browse...", AutoSize = true };
        browse.Click += BrowseForGameFolder;
        folderRow.Controls.Add(browse);
        content.Controls.Add(folderRow);

        content.Controls.Add(new Label { AutoSize = true, Text = "HTTPS sync endpoint:" });
        content.Controls.Add(_endpoint);
        content.Controls.Add(new Label { AutoSize = true, Text = "Sync token (from the web app; not your Blizzard password):" });
        content.Controls.Add(_token);

        var actions = new FlowLayoutPanel { AutoSize = true, Width = 700 };
        var saveAndStart = new Button { Text = "Save and start", AutoSize = true };
        saveAndStart.Click += SaveAndStart;
        var syncNow = new Button { Text = "Sync now", AutoSize = true };
        syncNow.Click += async (_, _) => await SyncChangedFilesAsync(force: true);
        actions.Controls.Add(saveAndStart);
        actions.Controls.Add(syncNow);
        content.Controls.Add(actions);
        content.Controls.Add(_status);
        content.Controls.Add(_log);

        _timer.Tick += async (_, _) => await SyncChangedFilesAsync(force: false);
        LoadSettings();
        if (Directory.Exists(AccountFolder) && IsAllowedEndpoint(_endpoint.Text) && !string.IsNullOrWhiteSpace(_token.Text))
        {
            StartPolling();
        }
    }

    private void BrowseForGameFolder(object? sender, EventArgs e)
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Select the WoW Forever client folder that contains Interface and WTF (for example, _classic_beta_).",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = false
        };
        if (Directory.Exists(_gameFolder.Text))
        {
            dialog.SelectedPath = _gameFolder.Text;
        }

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            _gameFolder.Text = dialog.SelectedPath;
        }
    }

    private void SaveAndStart(object? sender, EventArgs e)
    {
        if (!Directory.Exists(AccountFolder))
        {
            MessageBox.Show(this, "Choose the WoW client folder containing WTF\\Account first.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (!IsAllowedEndpoint(_endpoint.Text))
        {
            MessageBox.Show(this, "Use an HTTPS endpoint. Plain HTTP is allowed only for localhost during development.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (string.IsNullOrWhiteSpace(_token.Text))
        {
            MessageBox.Show(this, "Paste the sync token supplied by the web app.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (!InstallBundledAddon())
        {
            return;
        }

        SaveSettings();
        StartPolling();
    }

    private void StartPolling()
    {
        _timer.Start();
        _status.Text = "Watching for updated Sapphirix Party Planner character data...";
        _ = SyncChangedFilesAsync(force: false);
    }

    private async Task SyncChangedFilesAsync(bool force)
    {
        if (_syncing)
        {
            return;
        }

        if (!Directory.Exists(AccountFolder)
            || !IsAllowedEndpoint(_endpoint.Text)
            || string.IsNullOrWhiteSpace(_token.Text))
        {
            return;
        }

        _syncing = true;
        try
        {
            Uri.TryCreate(_endpoint.Text.Trim(), UriKind.Absolute, out var endpoint);
            var files = Directory.EnumerateFiles(AccountFolder, "DungeonTracker.lua", SearchOption.AllDirectories).ToArray();
            var sent = 0;
            foreach (var file in files)
            {
                try
                {
                    var info = new FileInfo(file);
                    var fingerprint = $"{info.Length}:{info.LastWriteTimeUtc.Ticks}";
                    if (!force && _uploadedFingerprints.TryGetValue(file, out var previous) && previous == fingerprint)
                    {
                        continue;
                    }

                    var snapshot = SavedVariablesReader.Read(file);
                    using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(snapshot, JsonOptions), System.Text.Encoding.UTF8, "application/json")
                    };
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token.Text.Trim());
                    using var response = await Http.SendAsync(request);
                    if (!response.IsSuccessStatusCode)
                    {
                        var detail = await response.Content.ReadAsStringAsync();
                        AppendLog($"Upload failed ({(int)response.StatusCode}) for {snapshot.Name}: {Truncate(detail, 160)}");
                        continue;
                    }

                    _uploadedFingerprints[file] = fingerprint;
                    sent++;
                    AppendLog($"Synced {snapshot.Name} (level {snapshot.Level}).");
                }
                catch (IOException)
                {
                    // WoW may be writing this file during /reload or logout; retry next poll.
                }
                catch (Exception ex)
                {
                    AppendLog($"Could not sync {Path.GetFileName(Path.GetDirectoryName(file))}: {ex.Message}");
                }
            }

            if (files.Length == 0)
            {
                _status.Text = "No character snapshots found yet. Log into WoW, then /reload or log out.";
            }
            else if (sent > 0)
            {
                _status.Text = $"Synced {sent} updated character snapshot(s). Last check: {DateTime.Now:T}.";
            }
            else
            {
                _status.Text = $"Watching {files.Length} character snapshot(s). Last check: {DateTime.Now:T}.";
            }
        }
        catch (Exception ex)
        {
            _status.Text = "Sync check failed; it will retry automatically.";
            AppendLog(ex.Message);
        }
        finally
        {
            _syncing = false;
        }
    }

    private void LoadSettings()
    {
        try
        {
            var path = SettingsPath;
            if (!File.Exists(path))
            {
                return;
            }

            var settings = JsonSerializer.Deserialize<CompanionSettings>(File.ReadAllText(path), JsonOptions);
            if (settings is null)
            {
                return;
            }

            _gameFolder.Text = settings.GameFolder;
            _endpoint.Text = settings.Endpoint;
            _token.Text = UnprotectToken(settings.Token);
        }
        catch (Exception ex)
        {
            AppendLog($"Could not load settings: {ex.Message}");
        }
    }

    private void SaveSettings()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath)!);
            var settings = new CompanionSettings(_gameFolder.Text.Trim(), _endpoint.Text.Trim(), ProtectToken(_token.Text.Trim()));
            File.WriteAllText(SettingsPath, JsonSerializer.Serialize(settings, JsonOptions));
            AppendLog("Settings saved for this Windows user.");
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Could not save settings: {ex.Message}", Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private bool InstallBundledAddon()
    {
        var source = Path.Combine(AppContext.BaseDirectory, "Addon", "DungeonTracker");
        var destination = Path.Combine(_gameFolder.Text.Trim(), "Interface", "AddOns", "DungeonTracker");
        if (!Directory.Exists(source))
        {
            if (File.Exists(Path.Combine(destination, "Core.lua")))
            {
                AppendLog("Bundled addon files were not found; using the already-installed addon.");
                return true;
            }

            MessageBox.Show(this, "The Sapphirix Party Planner addon files are missing beside this app. Re-extract the complete release ZIP, including its Addon folder.", Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return false;
        }

        try
        {
            Directory.CreateDirectory(destination);
            foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
            {
                var relativePath = Path.GetRelativePath(source, file);
                var target = Path.Combine(destination, relativePath);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.Copy(file, target, overwrite: true);
            }

            AppendLog("Installed or updated the Sapphirix Party Planner addon. Restart WoW or use /reload to load it.");
            return true;
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Could not install the addon: {ex.Message}{Environment.NewLine}Check that this is the game folder and that WoW is closed.", Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return false;
        }
    }

    private void AppendLog(string message)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action(() => AppendLog(message)));
            return;
        }

        _log.AppendText($"[{DateTime.Now:T}] {message}{Environment.NewLine}");
    }

    private static bool IsAllowedEndpoint(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps
            || (uri.Scheme == Uri.UriSchemeHttp && (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))));

    private static string ProtectToken(string token) => "dpapi:" + Convert.ToBase64String(
        ProtectedData.Protect(Encoding.UTF8.GetBytes(token), optionalEntropy: null, DataProtectionScope.CurrentUser));

    private static string UnprotectToken(string storedToken)
    {
        if (!storedToken.StartsWith("dpapi:", StringComparison.Ordinal))
        {
            return storedToken; // Migrate settings written by earlier prototype builds on next save.
        }

        var protectedBytes = Convert.FromBase64String(storedToken[6..]);
        var tokenBytes = ProtectedData.Unprotect(protectedBytes, optionalEntropy: null, DataProtectionScope.CurrentUser);
        return Encoding.UTF8.GetString(tokenBytes);
    }

    private static string Truncate(string value, int length) => value.Length <= length ? value : value[..length];
    private string AccountFolder => Path.Combine(_gameFolder.Text.Trim(), "WTF", "Account");
    private static string SettingsPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DungeonTrackerCompanion", "settings.json");

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        SaveSettings();
        base.OnFormClosing(e);
    }

    private sealed record CompanionSettings(string GameFolder, string Endpoint, string Token);
}
