import urllib.request, json

# Test that overview route exists (without auth first)
try:
    req = urllib.request.Request('http://localhost:8000/fees/overview')
    resp = urllib.request.urlopen(req)
    print("Should not reach here without auth")
except urllib.error.HTTPError as e:
    if e.code == 401 or e.code == 403:
        print(f"OK - /fees/overview route exists (got {e.code} without auth)")
    elif e.code == 422:
        body = e.read().decode()
        print(f"FAIL - Route conflict: {body}")
    else:
        body = e.read().decode()
        print(f"Got {e.code}: {body[:200]}")

# Check route listing
req2 = urllib.request.Request('http://localhost:8000/openapi.json')
resp2 = urllib.request.urlopen(req2)
paths = json.loads(resp2.read())['paths']
fee_paths = sorted([p for p in paths if 'fee' in p.lower()])
print(f"\nRegistered fee routes:")
for p in fee_paths:
    methods = ', '.join(paths[p].keys()).upper()
    print(f"  {methods:20s} {p}")
