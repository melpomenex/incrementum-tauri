#!/bin/bash
# Helper script to configure Claude Code with Anthropic or GLM models

set -e

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "========================================"
echo "Claude Code Configuration"
echo "========================================"
echo ""

# Create .claude directory if it doesn't exist
mkdir -p "$CLAUDE_DIR"

# Check if settings.json already exists
if [ -f "$SETTINGS_FILE" ]; then
    echo "⚠️  Existing settings.json found at $SETTINGS_FILE"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

# Choose provider
echo ""
echo "Select API provider:"
echo "  1) Browser login (Anthropic Pro/Team)"
echo "  2) API key (Anthropic)"
echo "  3) API key (Zhipu AI GLM)"
echo ""
read -p "Select provider (1-3) [default: 1]: " PROVIDER_CHOICE
PROVIDER_CHOICE=${PROVIDER_CHOICE:-1}

if [ "$PROVIDER_CHOICE" = "3" ]; then
    # GLM Configuration
    echo ""
    echo "📦 GLM (Zhipu AI) selected"
    echo ""
    echo "Get your API key from: https://open.bigmodel.cn/"
    echo "Your API key should look like: xxxxxxxx.wEqoN5ss5jTpFLzK"
    echo ""
    read -p "Enter your GLM API key: " API_KEY

    if [ -z "$API_KEY" ]; then
        echo "❌ API key cannot be empty!"
        exit 1
    fi

    BASE_URL="https://open.bigmodel.cn/api/anthropic"

    echo ""
    echo "Available GLM models:"
    echo "  1) GLM-4.7 (latest, recommended)"
    echo "  2) GLM-4.6"
    echo "  3) GLM-4.5"
    echo ""
    read -p "Select model (1-3) [default: 1]: " MODEL_CHOICE
    MODEL_CHOICE=${MODEL_CHOICE:-1}

    case $MODEL_CHOICE in
        1) MODEL="GLM-4.7" ;;
        2) MODEL="GLM-4.6" ;;
        3) MODEL="GLM-4.5" ;;
        *) MODEL="GLM-4.7" ;;
    esac
elif [ "$PROVIDER_CHOICE" = "2" ]; then
    # Anthropic API key Configuration
    echo ""
    echo "🤖 Anthropic (Claude) with API key selected"
    echo ""
    echo "Get your API key from: https://console.anthropic.com/"
    echo "Your API key should start with: sk-ant-"
    echo ""
    read -p "Enter your Anthropic API key: " API_KEY

    if [ -z "$API_KEY" ]; then
        echo "❌ API key cannot be empty!"
        exit 1
    fi

    # Use default Anthropic endpoint (empty means use default)
    BASE_URL=""

    echo ""
    echo "Available Anthropic models:"
    echo "  1) claude-sonnet-4-20250514 (Sonnet 4, latest)"
    echo "  2) claude-3-5-sonnet-20241022 (Sonnet 3.5)"
    echo "  3) claude-opus-4-20250514 (Opus 4)"
    echo "  4) claude-3-5-sonnet-20240620 (Sonnet 3.5 legacy)"
    echo ""
    read -p "Select model (1-4) [default: 2]: " MODEL_CHOICE
    MODEL_CHOICE=${MODEL_CHOICE:-2}

    case $MODEL_CHOICE in
        1) MODEL="claude-sonnet-4-20250514" ;;
        2) MODEL="claude-3-5-sonnet-20241022" ;;
        3) MODEL="claude-opus-4-20250514" ;;
        4) MODEL="claude-3-5-sonnet-20240620" ;;
        *) MODEL="claude-3-5-sonnet-20241022" ;;
    esac
else
    # Browser login - skip API key configuration
    echo ""
    echo "🌐 Browser login selected"
    echo ""
    echo "You will authenticate via browser when Claude starts."
    echo "Make sure you have Anthropic Pro/Team subscription."
    echo ""
    echo "✅ Skipping API key configuration"

    # Remove existing settings.json to force browser login
    rm -f "$SETTINGS_FILE"
fi

# Write settings.json (skip for browser login)
if [ "$PROVIDER_CHOICE" != "1" ]; then
    if [ -z "$BASE_URL" ]; then
        # Anthropic - no BASE_URL override needed
        cat > "$SETTINGS_FILE" <<EOJSON
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "$API_KEY",
    "ANTHROPIC_MODEL": "$MODEL"
  }
}
EOJSON
    else
        # GLM - need BASE_URL override
        cat > "$SETTINGS_FILE" <<EOJSON
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "$API_KEY",
    "ANTHROPIC_BASE_URL": "$BASE_URL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "$MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "$MODEL",
    "ANTHROPIC_MODEL": "$MODEL"
  }
}
EOJSON
    fi

    echo ""
    echo "✅ Configuration saved to $SETTINGS_FILE"
    echo ""
    echo "📝 Configuration:"
    if [ -z "$BASE_URL" ]; then
        echo "   Provider: Anthropic"
        echo "   Model:    $MODEL"
    else
        echo "   Provider: Zhipu AI (GLM)"
        echo "   Base URL: $BASE_URL"
        echo "   Model:    $MODEL"
    fi
else
    echo ""
    echo "📝 Configuration:"
    echo "   Provider: Browser login (Anthropic Pro/Team)"
fi

echo ""
echo "🚀 Starting Claude for authentication..."
echo "========================================"
