#!/bin/bash

# CLI script for triggering website analysis
# Usage: ./scripts/analyze.sh <site_name> <url> [api_key]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
API_URL="${API_URL:-http://localhost:3000}"
POLL_INTERVAL="${POLL_INTERVAL:-2}" # seconds
MAX_WAIT_TIME="${MAX_WAIT_TIME:-300}" # 5 minutes

# Function to print usage
usage() {
  echo "Usage: $0 <site_name> <url> [api_key]"
  echo ""
  echo "Arguments:"
  echo "  site_name  - Name for the design system (filesystem-safe, alphanumeric, hyphens, underscores)"
  echo "  url        - Website URL to analyze (must be valid HTTP/HTTPS URL)"
  echo "  api_key    - API key for authentication (optional, can be set via API_KEY env var)"
  echo ""
  echo "Environment variables:"
  echo "  API_URL         - API server URL (default: http://localhost:3000)"
  echo "  API_KEY         - API key for authentication (if not provided as argument)"
  echo "  POLL_INTERVAL   - Status polling interval in seconds (default: 2)"
  echo "  MAX_WAIT_TIME   - Maximum wait time in seconds (default: 300)"
  echo ""
  echo "Examples:"
  echo "  $0 example https://example.com"
  echo "  $0 example https://example.com my-api-key"
  echo "  API_KEY=my-key $0 example https://example.com"
  exit 1
}

# Validate arguments
if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo -e "${RED}Error: Invalid number of arguments${NC}"
  usage
fi

SITE_NAME="$1"
URL="$2"
API_KEY="${3:-${API_KEY}}"

# Validate site_name (filesystem-safe)
if ! echo "$SITE_NAME" | grep -qE '^[a-zA-Z0-9_-]+$'; then
  echo -e "${RED}Error: site_name must be filesystem-safe (alphanumeric, hyphens, underscores only)${NC}"
  exit 1
fi

# Validate URL format
if ! echo "$URL" | grep -qE '^https?://'; then
  echo -e "${RED}Error: URL must start with http:// or https://${NC}"
  exit 1
fi

# Check if API key is provided
if [ -z "$API_KEY" ]; then
  echo -e "${RED}Error: API key is required. Provide it as argument or set API_KEY environment variable.${NC}"
  exit 1
fi

# Function to submit analysis request
submit_analysis() {
  echo -e "${YELLOW}Submitting analysis request...${NC}"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/analyze" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "{
      \"site_name\": \"${SITE_NAME}\",
      \"url\": \"${URL}\"
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -ne 202 ]; then
    echo -e "${RED}Error: Analysis request failed with HTTP ${HTTP_CODE}${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
  
  JOB_ID=$(echo "$BODY" | jq -r '.job_id' 2>/dev/null)
  CORRELATION_ID=$(echo "$BODY" | jq -r '.correlation_id' 2>/dev/null)
  
  if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
    echo -e "${RED}Error: Failed to get job_id from response${NC}"
    echo "$BODY"
    exit 1
  fi
  
  echo -e "${GREEN}Analysis job submitted successfully${NC}"
  echo "  Job ID: ${JOB_ID}"
  echo "  Correlation ID: ${CORRELATION_ID}"
  echo ""
  
  echo "$JOB_ID"
}

# Function to check job status
check_status() {
  local job_id="$1"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/status/${job_id}" \
    -H "X-API-Key: ${API_KEY}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 404 ]; then
    # Job not found - might be completed and deleted
    echo "completed"
    return
  fi
  
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}Error: Status check failed with HTTP ${HTTP_CODE}${NC}"
    echo "$BODY"
    exit 1
  fi
  
  STATUS=$(echo "$BODY" | jq -r '.status' 2>/dev/null)
  echo "$STATUS"
}

# Function to poll job status
poll_status() {
  local job_id="$1"
  local start_time=$(date +%s)
  local elapsed=0
  
  echo -e "${YELLOW}Polling job status...${NC}"
  
  while [ $elapsed -lt $MAX_WAIT_TIME ]; do
    STATUS=$(check_status "$job_id")
    
    case "$STATUS" in
      "completed")
        echo -e "${GREEN}Analysis completed successfully!${NC}"
        
        # Try to get result location (might be deleted already)
        RESPONSE=$(curl -s -X GET "${API_URL}/status/${job_id}" \
          -H "X-API-Key: ${API_KEY}" 2>/dev/null || echo '{}')
        RESULT_LOCATION=$(echo "$RESPONSE" | jq -r '.result_location' 2>/dev/null)
        
        if [ -n "$RESULT_LOCATION" ] && [ "$RESULT_LOCATION" != "null" ]; then
          echo "  Result location: ${RESULT_LOCATION}"
        else
          echo "  Result location: designs/${SITE_NAME}/design-system.json"
        fi
        
        return 0
        ;;
      "failed")
        echo -e "${RED}Analysis failed!${NC}"
        
        # Try to get error message
        RESPONSE=$(curl -s -X GET "${API_URL}/status/${job_id}" \
          -H "X-API-Key: ${API_KEY}" 2>/dev/null || echo '{}')
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error_message' 2>/dev/null)
        
        if [ -n "$ERROR_MSG" ] && [ "$ERROR_MSG" != "null" ]; then
          echo "  Error: ${ERROR_MSG}"
        fi
        
        exit 1
        ;;
      "pending"|"queued"|"in-progress")
        echo -e "${YELLOW}Status: ${STATUS} (waiting ${POLL_INTERVAL}s...)${NC}"
        sleep "$POLL_INTERVAL"
        ;;
      *)
        echo -e "${RED}Unknown status: ${STATUS}${NC}"
        exit 1
        ;;
    esac
    
    elapsed=$(($(date +%s) - start_time))
  done
  
  echo -e "${RED}Error: Timeout waiting for analysis to complete (${MAX_WAIT_TIME}s)${NC}"
  exit 1
}

# Main execution
main() {
  echo "Design System Analyzer CLI"
  echo "=========================="
  echo "Site name: ${SITE_NAME}"
  echo "URL: ${URL}"
  echo "API URL: ${API_URL}"
  echo ""
  
  # Check if jq is available
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON parsing may fail.${NC}"
    echo "Install jq for better output formatting: sudo apt-get install jq"
    echo ""
  fi
  
  # Check if curl is available
  if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed${NC}"
    exit 1
  fi
  
  # Submit analysis
  JOB_ID=$(submit_analysis)
  
  # Poll status
  poll_status "$JOB_ID"
}

# Run main function
main

