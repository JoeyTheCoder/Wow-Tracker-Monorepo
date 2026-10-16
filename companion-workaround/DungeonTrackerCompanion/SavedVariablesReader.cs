using System.Globalization;
using System.Text.RegularExpressions;

namespace SapphirixPartyPlannerCompanion;

internal sealed record CharacterSnapshot(
    string Name,
    string Realm,
    string Class,
    int Level,
    long UpdatedAt);

internal static class SavedVariablesReader
{
    public static CharacterSnapshot Read(string path)
    {
        var source = File.ReadAllText(path);
        var name = ReadString(source, "name");
        var realm = ReadString(source, "realm") ?? string.Empty;
        var characterClass = ReadString(source, "class") ?? string.Empty;
        var level = ReadInteger(source, "level");
        var updatedAt = ReadLong(source, "updatedAt");

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidDataException("The addon's saved character name is missing.");
        }

        if (level is < 1 or > 1000)
        {
            throw new InvalidDataException("The saved character level is invalid.");
        }

        if (updatedAt <= 0)
        {
            updatedAt = new DateTimeOffset(File.GetLastWriteTimeUtc(path)).ToUnixTimeSeconds();
        }

        return new CharacterSnapshot(name, realm, characterClass, level, updatedAt);
    }

    private static string? ReadString(string source, string key)
    {
        var escapedKey = Regex.Escape(key);
        var pattern = $"(?m)^\\s*(?:\\[\\s*\\\"{escapedKey}\\\"\\s*\\]|{escapedKey})\\s*=\\s*\\\"((?:\\\\.|[^\\\"\\\\])*)\\\"\\s*,?\\s*$";
        var match = Regex.Match(source, pattern);
        return match.Success ? DecodeLuaString(match.Groups[1].Value) : null;
    }

    private static int ReadInteger(string source, string key)
    {
        var escapedKey = Regex.Escape(key);
        var pattern = $"(?m)^\\s*(?:\\[\\s*\\\"{escapedKey}\\\"\\s*\\]|{escapedKey})\\s*=\\s*(-?\\d+)\\s*,?\\s*$";
        var match = Regex.Match(source, pattern);
        return match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : 0;
    }

    private static long ReadLong(string source, string key)
    {
        var escapedKey = Regex.Escape(key);
        var pattern = $"(?m)^\\s*(?:\\[\\s*\\\"{escapedKey}\\\"\\s*\\]|{escapedKey})\\s*=\\s*(-?\\d+)\\s*,?\\s*$";
        var match = Regex.Match(source, pattern);
        return match.Success && long.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : 0;
    }

    private static string DecodeLuaString(string encoded)
    {
        var result = new System.Text.StringBuilder(encoded.Length);
        for (var index = 0; index < encoded.Length; index++)
        {
            var current = encoded[index];
            if (current != '\\' || index + 1 >= encoded.Length)
            {
                result.Append(current);
                continue;
            }

            var escaped = encoded[++index];
            switch (escaped)
            {
                case 'n': result.Append('\n'); break;
                case 'r': result.Append('\r'); break;
                case 't': result.Append('\t'); break;
                case '\\': result.Append('\\'); break;
                case '"': result.Append('"'); break;
                default:
                    if (char.IsDigit(escaped))
                    {
                        var digits = new System.Text.StringBuilder().Append(escaped);
                        while (digits.Length < 3 && index + 1 < encoded.Length && char.IsDigit(encoded[index + 1]))
                        {
                            digits.Append(encoded[++index]);
                        }

                        result.Append((char)int.Parse(digits.ToString(), CultureInfo.InvariantCulture));
                    }
                    else
                    {
                        result.Append(escaped);
                    }
                    break;
            }
        }

        return result.ToString();
    }
}
