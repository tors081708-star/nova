# Open WebUI + NOVA (free, sovereign)

Runs the real Open WebUI in podman, pointed at NOVA's OpenAI-compatible proxy.
Every model you pick is a free OpenRouter model; NOVA holds the key server-side.

## Launch
    ./start.sh
    # remote NOVA:  NOVA_BASE_URL="https://your-nova-backend" ./start.sh
Then open http://localhost:3080

## Manual connection (existing Open WebUI)
Settings -> Connections -> OpenAI API
  Base URL: {NOVA}/api/v1
  API Key:  any value (NOVA ignores it)
