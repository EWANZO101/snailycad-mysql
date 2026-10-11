Locales = {
  en = {
    ptt = "Radio: push to talk",
    open = "Radio: open the handheld",
    channel_up = "Radio: next channel",
    channel_down = "Radio: previous channel",
    earpiece = "Radio: earpiece on/off",
    no_radio = "You don't have a radio.",
    earpiece_on = "Earpiece in: people nearby can't hear your radio.",
    earpiece_off = "Earpiece out: people nearby hear your radio.",
    channel_set = "Radio channel: %s",
    channel_unknown = "There is no radio channel called %s.",
    switched = "Dispatch moved you to %s.",
    busy = "The channel is busy.",
    cannot_use = "You can't use your radio right now.",
    not_configured = "The radio isn't set up: the server owner has to set snailycad_radio_api_url and snailycad_radio_api_token.",
    setup = "Radio: setup (admins)",
    setup_denied = "Only server admins can set up the radio.",
    -- shown on the handheld / HUD (the in-game UI)
    connecting = "SEARCHING…",
    noChannel = "NO CHANNEL",
    tx = "TX",
  },
}

local function locale()
  return Locales[Config.Locale] or Locales.en
end

--- a translated string; extra arguments are formatted in with string.format
function _L(key, ...)
  local text = locale()[key] or Locales.en[key] or key
  if select("#", ...) > 0 then
    return text:format(...)
  end
  return text
end

--- the strings the in-game UI needs
function UiLocale()
  local text = locale()
  return {
    connecting = text.connecting or Locales.en.connecting,
    noChannel = text.noChannel or Locales.en.noChannel,
    tx = text.tx or Locales.en.tx,
  }
end
