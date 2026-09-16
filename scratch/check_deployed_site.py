import urllib.request
import re

url = "https://scholar-path-ai-sih.vercel.app/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    html = urllib.request.urlopen(req).read().decode("utf-8")
    print("HTML length:", len(html))

    scripts = re.findall(r'src=["\']([^"\']+)["\']', html)
    print("Script src tags found:", scripts)

    for s in scripts:
        if "js/" in s or s.endswith(".js"):
            s_url = url.rstrip("/") + "/" + s.lstrip("/")
            try:
                s_req = urllib.request.Request(s_url, headers={"User-Agent": "Mozilla/5.0"})
                s_content = urllib.request.urlopen(s_req).read().decode("utf-8")
                print(f"=== {s} (len={len(s_content)}) ===")
                if "Failed to fetch" in s_content:
                    print(f"  -> Found 'Failed to fetch' in {s}")
                if "Unable to connect" in s_content:
                    print(f"  -> Found 'Unable to connect' in {s}")
                if "api/solve" in s_content:
                    print(f"  -> Found 'api/solve' in {s}")
            except Exception as e:
                print(f"Error fetching {s}: {e}")
except Exception as e:
    print("Error fetching HTML:", e)
