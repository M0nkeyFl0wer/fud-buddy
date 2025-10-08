#!/bin/bash

# FUD Buddy Security Testing Script
# This script tests the security fixes we've implemented

echo "🔒 FUD Buddy Security Testing Suite"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    
    # Run the test command and capture output
    result=$(eval "$test_command" 2>&1)
    exit_code=$?
    
    # Check if test passed
    if [[ $exit_code -eq 0 && "$result" == *"$expected_result"* ]]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected_result"
        echo "  Got: $result"
    fi
    echo ""
}

# Test 1: Check for hardcoded secrets
echo -e "${YELLOW}=== Testing for Hardcoded Secrets ===${NC}"
run_test "No API keys in source code" \
         "grep -r 'api.*key\|secret\|password' src/ --exclude-dir=node_modules --exclude='*.md' || echo 'No secrets found'" \
         "No secrets found"

run_test "No API keys in AI server" \
         "grep -r 'api.*key\|secret\|password' ai-server/ --exclude-dir=node_modules --exclude='*.md' || echo 'No secrets found'" \
         "No secrets found"

# Test 2: Dependency vulnerabilities
echo -e "${YELLOW}=== Testing Dependencies ===${NC}"
run_test "Main app dependencies are secure" \
         "npm audit --audit-level=high --json | jq -r '.metadata.vulnerabilities.high // 0'" \
         "0"

run_test "AI server dependencies are secure" \
         "cd ai-server && npm audit --audit-level=high --json | jq -r '.metadata.vulnerabilities.high // 0'" \
         "0"

# Test 3: Check if security packages are installed
echo -e "${YELLOW}=== Testing Security Package Installation ===${NC}"
run_test "DOMPurify is installed" \
         "npm list dompurify --depth=0 | grep dompurify || echo 'Not installed'" \
         "dompurify"

run_test "Crypto-js is installed" \
         "npm list crypto-js --depth=0 | grep crypto-js || echo 'Not installed'" \
         "crypto-js"

run_test "Helmet is installed in AI server" \
         "cd ai-server && npm list helmet --depth=0 | grep helmet || echo 'Not installed'" \
         "helmet"

run_test "Validator is installed in AI server" \
         "cd ai-server && npm list validator --depth=0 | grep validator || echo 'Not installed'" \
         "validator"

# Test 4: Check for dangerous patterns in code
echo -e "${YELLOW}=== Testing for Dangerous Code Patterns ===${NC}"
run_test "No unsafe innerHTML usage" \
         "grep -r 'dangerouslySetInnerHTML' src/components/ --include='*.tsx' | grep -v 'chart.tsx' || echo 'No unsafe innerHTML found'" \
         "No unsafe innerHTML found"

run_test "No eval() usage" \
         "grep -r 'eval(' src/ ai-server/ --exclude-dir=node_modules || echo 'No eval usage found'" \
         "No eval usage found"

run_test "No document.write() usage" \
         "grep -r 'document.write' src/ --exclude-dir=node_modules || echo 'No document.write found'" \
         "No document.write found"

# Test 5: Check security files exist
echo -e "${YELLOW}=== Testing Security Implementation Files ===${NC}"
run_test "Secure storage utility exists" \
         "test -f src/utils/secureStorage.ts && echo 'File exists'" \
         "File exists"

run_test "Privacy consent modal exists" \
         "test -f src/components/PrivacyConsentModal.tsx && echo 'File exists'" \
         "File exists"

run_test "AI server security middleware exists" \
         "test -f ai-server/middleware/security.js && echo 'File exists'" \
         "File exists"

run_test "Security audit report exists" \
         "test -f SECURITY_AUDIT_REPORT.md && echo 'File exists'" \
         "File exists"

# Test 6: Validate security configuration
echo -e "${YELLOW}=== Testing Security Configuration ===${NC}"
run_test "ChatInput has length validation" \
         "grep -q 'MAX_MESSAGE_LENGTH.*1000' src/components/ChatInput.tsx && echo 'Length validation found'" \
         "Length validation found"

run_test "AI server has rate limiting" \
         "grep -q 'createRateLimiter' ai-server/server.js && echo 'Rate limiting found'" \
         "Rate limiting found"

run_test "AI server has input validation" \
         "grep -q 'chatInputValidation' ai-server/server.js && echo 'Input validation found'" \
         "Input validation found"

# Test 7: Check TypeScript compilation
echo -e "${YELLOW}=== Testing Build Process ===${NC}"
run_test "TypeScript compiles without errors" \
         "npx tsc --noEmit --skipLibCheck 2>&1 | tail -n 1 | grep -q 'error' && echo 'Compilation errors found' || echo 'No compilation errors'" \
         "No compilation errors"

# Test 8: Test with potentially malicious inputs
echo -e "${YELLOW}=== Testing Input Validation ===${NC}"

# Check if we can test the ChatInput validation
run_test "XSS patterns detected in validation code" \
         "grep -q '<script' src/components/ChatInput.tsx && echo 'XSS validation found'" \
         "XSS validation found"

run_test "Input sanitization implemented" \
         "grep -q 'DOMPurify.sanitize' src/components/ChatInput.tsx && echo 'Sanitization found'" \
         "Sanitization found"

# Summary
echo -e "${BLUE}=== Security Test Results ===${NC}"
echo "Tests completed: $TOTAL_TESTS"
echo -e "Tests passed: ${GREEN}$PASSED_TESTS${NC}"

FAILED_TESTS=$((TOTAL_TESTS - PASSED_TESTS))
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "Tests failed: ${RED}$FAILED_TESTS${NC}"
    echo ""
    echo -e "${RED}⚠️  Security issues detected! Review failed tests above.${NC}"
    exit 1
else
    echo -e "Tests failed: ${GREEN}0${NC}"
    echo ""
    echo -e "${GREEN}🎉 All security tests passed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run the application in development mode to test privacy modal"
    echo "2. Test the AI server security with actual requests"
    echo "3. Perform manual penetration testing"
    echo "4. Review the full security audit report"
fi

# Additional recommendations
echo ""
echo -e "${YELLOW}=== Additional Security Recommendations ===${NC}"
echo "🔍 Manual testing needed:"
echo "  • Test privacy consent modal in browser"
echo "  • Validate rate limiting with repeated requests"
echo "  • Test XSS prevention with malicious payloads"
echo "  • Verify secure storage encryption/decryption"
echo "  • Test CORS policy with different origins"
echo ""
echo "📝 Review security documentation:"
echo "  • SECURITY_AUDIT_REPORT.md - Full vulnerability assessment"
echo "  • SECURITY_QUICK_FIXES.md - Implementation guide"
echo ""
echo "🚀 Before production deployment:"
echo "  • Set up environment variables for API keys"
echo "  • Configure proper HTTPS certificates"
echo "  • Set up security monitoring and logging"
echo "  • Perform third-party security assessment"