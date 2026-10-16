local frame = CreateFrame("Frame")

local function SaveCharacterSnapshot(level)
    local name = UnitName("player")
    local _, class = UnitClass("player")

    DungeonTrackerDB = DungeonTrackerDB or {}
    DungeonTrackerDB.name = name
    DungeonTrackerDB.realm = GetRealmName()
    DungeonTrackerDB.class = class
    DungeonTrackerDB.level = level or UnitLevel("player")
    DungeonTrackerDB.updatedAt = time()

    print("Sapphirix Party Planner: character=" .. tostring(name)
        .. ", level=" .. tostring(DungeonTrackerDB.level))
end

frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("PLAYER_LEVEL_UP")
frame:RegisterEvent("PLAYER_LOGOUT")

frame:SetScript("OnEvent", function(self, event, level)
    if event == "PLAYER_LOGIN" then
        SaveCharacterSnapshot(UnitLevel("player"))
    elseif event == "PLAYER_LEVEL_UP" then
        -- PLAYER_LEVEL_UP supplies the new level as its first event argument.
        SaveCharacterSnapshot(level)
    elseif event == "PLAYER_LOGOUT" then
        SaveCharacterSnapshot(UnitLevel("player"))
    end
end)