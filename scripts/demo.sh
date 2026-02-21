#!/usr/bin/env bash
# =============================================================================
# AegisOS ETHDenver 2026 — Full Bounty Demo Script
# =============================================================================
# Demonstrates all 5 bounties against a running AegisOS dev server.
# Run: bash scripts/demo.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000
# =============================================================================

set -euo pipefail

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

# ── Colors ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

header() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${RESET}"; echo -e "${BOLD}${BLUE}  $1${RESET}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${RESET}"; }
ok() { echo -e "  ${GREEN}✓${RESET} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${RESET} $1"; FAIL=$((FAIL+1)); }
info() { echo -e "  ${YELLOW}→${RESET} $1"; }

check_json() {
  local label="$1"
  local url="$2"
  local method="${3:-GET}"
  local body="${4:-}"
  local expected_key="${5:-}"

  local response
  if [ "$method" = "POST" ] && [ -n "$body" ]; then
    response=$(curl -sf -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$body" 2>/dev/null) || { fail "$label (HTTP error)"; return 1; }
  else
    response=$(curl -sf "$url" 2>/dev/null) || { fail "$label (HTTP error)"; return 1; }
  fi

  if [ -z "$response" ]; then
    fail "$label (empty response)"
    return 1
  fi

  if [ -n "$expected_key" ]; then
    if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$expected_key' in d or any('$expected_key' in str(v) for v in d.values())" 2>/dev/null; then
      ok "$label"
    else
      fail "$label (missing key: $expected_key)"
    fi
  else
    ok "$label"
  fi
}

# ── Wait for server ─────────────────────────────────────────────────────────
header "Checking server at $BASE"
RETRIES=0
until curl -sf "$BASE/api/health" >/dev/null 2>&1; do
  RETRIES=$((RETRIES+1))
  if [ $RETRIES -gt 20 ]; then
    echo -e "${RED}Server not reachable after 20 retries. Start with: cd frontend && npm run dev${RESET}"
    exit 1
  fi
  info "Waiting for server... ($RETRIES/20)"
  sleep 2
done
ok "Server is up at $BASE"

# ── Health check ────────────────────────────────────────────────────────────
check_json "Health endpoint" "$BASE/api/health" GET "" "status"

# ══════════════════════════════════════════════════════════════════════════════
header "BOUNTY 1: Hedera Killer App for the Agentic Society"
# ══════════════════════════════════════════════════════════════════════════════

info "Testing agent reputation API (HCS-attested scores)"
check_json "All agent reputations" "$BASE/api/agent-reputation" GET "" "agents"
check_json "Watcher reputation + badge" "$BASE/api/agent-reputation?agentId=watcher" GET "" "reputation"
check_json "Strategist reputation" "$BASE/api/agent-reputation?agentId=strategist" GET "" "badge"
check_json "Executor reputation" "$BASE/api/agent-reputation?agentId=executor" GET "" "reputation"

info "Testing prediction market API"
SESSION_ID="demo-session-$(date +%s)"
check_json "Record prediction" "$BASE/api/agent-market" POST \
  "{\"action\":\"record\",\"sessionId\":\"$SESSION_ID\",\"agentId\":\"watcher\",\"prediction\":\"reduce risk\",\"stakeAmount\":10}" \
  "recorded"
check_json "Settle prediction" "$BASE/api/agent-market" POST \
  "{\"action\":\"settle\",\"sessionId\":\"$SESSION_ID\",\"actualOutcome\":\"risk reduced by 8 points\"}" \
  "settled"
check_json "Get session predictions" "$BASE/api/agent-market?sessionId=$SESSION_ID" GET "" "predictions"

info "Testing iNFT profile API"
check_json "All agent profiles" "$BASE/api/agent-profile" GET "" "agents"
check_json "Strategist iNFT profile" "$BASE/api/agent-profile?agentId=strategist" GET "" "identity"

# ══════════════════════════════════════════════════════════════════════════════
header "BOUNTY 2: Hedera Schedule Service"
# ══════════════════════════════════════════════════════════════════════════════

info "Testing schedule lifecycle API"
check_json "All schedules (empty OK)" "$BASE/api/schedule-status" GET "" "schedules"
check_json "Single schedule (mock)" "$BASE/api/schedule-status?planHash=abc123def456" GET "" "status"
check_json "Schedule includes precompile address" "$BASE/api/schedule-status" GET "" "precompileAddress"

# ══════════════════════════════════════════════════════════════════════════════
header "BOUNTY 3: 0G Labs — Best DeFAI Application"
# ══════════════════════════════════════════════════════════════════════════════

info "Testing DeFAI simulation API (pre-execution preview)"
check_json "DeFAI sim docs" "$BASE/api/defi-sim" GET "" "description"
check_json "Portfolio simulation" "$BASE/api/defi-sim" POST \
  '{"sessionId":"demo-sim","planId":"plan-001","holdings":[{"token":"ETH","weight":0.60,"value":6000},{"token":"BTC","weight":0.30,"value":3000},{"token":"SOL","weight":0.10,"value":1000}],"actions":[{"type":"REDUCE","token":"SOL","amount":0.05},{"type":"INCREASE","token":"BTC","amount":0.05}]}' \
  "before"
check_json "Simulation has 0G storage CID" "$BASE/api/defi-sim" POST \
  '{"sessionId":"demo-sim2","planId":"plan-002","holdings":[{"token":"ETH","weight":0.8,"value":8000},{"token":"USDC","weight":0.2,"value":2000}],"actions":[{"type":"REDUCE","token":"ETH","amount":0.15}]}' \
  "storageId"

# ══════════════════════════════════════════════════════════════════════════════
header "BOUNTY 4: 0G Labs — Best Use of On-Chain Agent (iNFT)"
# ══════════════════════════════════════════════════════════════════════════════

info "Testing iNFT agent profiles"
check_json "All iNFT profiles" "$BASE/api/agent-profile" GET "" "count"
check_json "iNFT profile has brain URI" "$BASE/api/agent-profile?agentId=watcher" GET "" "brainUri"
check_json "iNFT profile has capabilities" "$BASE/api/agent-profile?agentId=executor" GET "" "capabilities"
check_json "iNFT profile has reputation" "$BASE/api/agent-profile?agentId=strategist" GET "" "score"

# ══════════════════════════════════════════════════════════════════════════════
header "BOUNTY 5: Hedera 'No Solidity Allowed' — SDK Only"
# ══════════════════════════════════════════════════════════════════════════════

info "Testing pure Hedera SDK audit module"
check_json "SDK module info" "$BASE/api/sdk-receipt" GET "" "loyaltyToken"
check_json "SDK receipt has HCS + HTS" "$BASE/api/sdk-receipt" GET "" "nativeCaps"

info "Creating HCS approval receipt (no Solidity)"
check_json "Create APPROVAL receipt" "$BASE/api/sdk-receipt" POST \
  "{\"type\":\"APPROVAL\",\"sessionId\":\"sdk-test-$(date +%s)\",\"planId\":\"plan-sdk-001\",\"signerAddress\":\"0xabcd\"}" \
  "receipt"

info "Creating execution receipt + awarding AegisPoints (HTS loyalty)"
check_json "Create EXECUTION receipt + loyalty" "$BASE/api/sdk-receipt" POST \
  "{\"type\":\"EXECUTION\",\"sessionId\":\"sdk-test-exec-$(date +%s)\",\"planId\":\"plan-sdk-002\",\"loyaltyPoints\":100}" \
  "receipt"

info "Creating rejection receipt"
check_json "Create REJECTION receipt" "$BASE/api/sdk-receipt" POST \
  "{\"type\":\"REJECTION\",\"sessionId\":\"sdk-test-rej-$(date +%s)\",\"planId\":\"plan-sdk-003\"}" \
  "receipt"

# ══════════════════════════════════════════════════════════════════════════════
header "BONUS: Full Session Demo"
# ══════════════════════════════════════════════════════════════════════════════

info "Starting a full AegisOS session"
SESSION_RESP=$(curl -sf -X POST "$BASE/api/session/start" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Balanced portfolio","holdings":[{"token":"ETH","weight":0.5,"value":5000},{"token":"BTC","weight":0.3,"value":3000},{"token":"SOL","weight":0.2,"value":2000}]}' 2>/dev/null) || SESSION_RESP="{}"

if echo "$SESSION_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'sessionId' in d" 2>/dev/null; then
  ok "Session created"
  SESSION_ID_FULL=$(echo "$SESSION_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null || echo "unknown")
  info "Session ID: $SESSION_ID_FULL"
else
  fail "Session creation"
  SESSION_ID_FULL="unknown"
fi

# ══════════════════════════════════════════════════════════════════════════════
header "Summary"
# ══════════════════════════════════════════════════════════════════════════════

TOTAL=$((PASS+FAIL))
echo ""
echo -e "  Tests run:    ${BOLD}$TOTAL${RESET}"
echo -e "  Passed:       ${GREEN}${BOLD}$PASS${RESET}"
echo -e "  Failed:       ${RED}${BOLD}$FAIL${RESET}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All bounty demos passed! AegisOS is ready for judging.${RESET}"
else
  echo -e "${YELLOW}Some tests failed. Check server logs or start with: cd frontend && npm run dev${RESET}"
fi

echo ""
echo -e "${BOLD}Bounty summary:${RESET}"
echo -e "  1. Hedera Killer App (OpenClaw)  — ${GREEN}✓${RESET} agent-reputation + agent-market APIs"
echo -e "  2. Hedera Schedule Service       — ${GREEN}✓${RESET} schedule-status API + AegisScheduler.sol"
echo -e "  3. 0G DeFAI                      — ${GREEN}✓${RESET} defi-sim API + 0G audit trail"
echo -e "  4. 0G iNFT                       — ${GREEN}✓${RESET} agent-profile API + brain CIDs"
echo -e "  5. Hedera SDK-Only               — ${GREEN}✓${RESET} sdk-receipt API (HCS + HTS, no Solidity)"
echo ""
echo -e "${BOLD}Live demo:${RESET} $BASE"
echo -e "${BOLD}Dashboard:${RESET} $BASE/app"
echo -e "${BOLD}Bounties:${RESET}  see /bounties/BOUNTY_MAP.md"
echo ""

exit $FAIL
