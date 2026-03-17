export const WIFI_TEMPLATE = `Generate {count} WiFi network entries including Evil Twin APs for cybersecurity training.

Requirements:
- Realistic BSSID format (XX:XX:XX:XX:XX:XX)
- Signal strength in dBm (-30 to -90 range)
- Mix of WPA2-PSK (evil twin indicator), 802.1X (corporate), Open (suspicious)
- Include SSID names
- Locale: {locale}

Format as JSON array matching WiFiNetwork interface. Each network must have: ssid, bssid, signalStrength, authType ("WPA2-PSK"|"802.1X"|"Open"), isEvilTwin, indicators array.`;
