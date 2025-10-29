#!/bin/bash
# Test script to verify Gzip compression is working

echo "Testing Gzip Compression on Entoo API..."
echo "=========================================="
echo ""

# Test 1: Verify gzip header is present
echo "Test 1: Checking if gzip encoding is enabled..."
GZIP_HEADER=$(curl -s -I -H "Accept-Encoding: gzip" http://localhost:8000/api/health | grep -i "content-encoding: gzip")

if [ -n "$GZIP_HEADER" ]; then
    echo "✓ PASS: Gzip encoding header found"
else
    echo "✗ FAIL: Gzip encoding header NOT found"
    exit 1
fi

echo ""

# Test 2: Measure compression ratio on subjects API
echo "Test 2: Measuring compression ratio on /api/subjects?with_counts=true..."

WITHOUT_GZIP=$(curl -s -w "%{size_download}" -o /dev/null http://localhost:8000/api/subjects?with_counts=true)
WITH_GZIP=$(curl -s -H "Accept-Encoding: gzip" -w "%{size_download}" -o /dev/null http://localhost:8000/api/subjects?with_counts=true)

echo "  Without gzip: ${WITHOUT_GZIP} bytes"
echo "  With gzip: ${WITH_GZIP} bytes"

# Calculate compression percentage
COMPRESSION_PERCENT=$(python -c "print(int((1 - ${WITH_GZIP}/${WITHOUT_GZIP})*100))")

echo "  Compression: ${COMPRESSION_PERCENT}% smaller"

if [ "$COMPRESSION_PERCENT" -ge 60 ]; then
    echo "✓ PASS: Compression ratio ${COMPRESSION_PERCENT}% meets 60% target"
else
    echo "✗ FAIL: Compression ratio ${COMPRESSION_PERCENT}% is below 60% target"
    exit 1
fi

echo ""

# Test 3: Verify Vary header is present
echo "Test 3: Checking if Vary header is present..."
VARY_HEADER=$(curl -s -I -H "Accept-Encoding: gzip" http://localhost:8000/api/subjects | grep -i "vary")

if [ -n "$VARY_HEADER" ]; then
    echo "✓ PASS: Vary header found (proper cache handling)"
else
    echo "✗ FAIL: Vary header NOT found"
    exit 1
fi

echo ""
echo "=========================================="
echo "All tests passed! ✓"
echo "Gzip compression is working correctly"
echo "Average bandwidth reduction: ${COMPRESSION_PERCENT}%"
