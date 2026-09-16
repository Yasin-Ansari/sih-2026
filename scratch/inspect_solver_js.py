import urllib.request

url = "https://scholar-path-ai-sih.vercel.app/js/solver.js"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    content = urllib.request.urlopen(req).read().decode("utf-8")
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        if "Unable to connect" in line or "fetch" in line or "ApiClient" in line or "ClientSideSolver" in line:
            print(f"Line {idx+1}: {line[:120]}")
except Exception as e:
    print("Error:", e)
