import urllib.request
import urllib.error

url = "https://scholar-path-ai-sih.vercel.app/api/solve"
req = urllib.request.Request(
    url,
    data=b'{"problem":"2+2"}',
    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("STATUS:", resp.status)
        print("BODY:", resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("HEADERS:", dict(e.headers))
    print("BODY:", e.read().decode("utf-8"))
except Exception as ex:
    print("EX:", ex)
