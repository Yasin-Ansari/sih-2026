import json
import requests
import time

BASE_URL = "http://localhost:8000"

def run_all_tests():
    with open("testsprite_tests/testsprite_test_plan.json", "r", encoding="utf-8") as f:
        test_plan = json.load(f)

    results = []
    print("[TestSprite] Starting Test Execution on AI Mathematics Visual Solver...\n")

    for tc in test_plan:
        tc_id = tc["id"]
        title = tc["title"]
        endpoint = tc["endpoint"]
        method = tc["method"]
        payload = tc.get("payload", None)

        url = f"{BASE_URL}{endpoint}"
        start_time = time.time()
        passed = False
        error_msg = ""
        response_data = None

        try:
            if method == "GET":
                resp = requests.get(url, timeout=15)
            elif method == "POST":
                resp = requests.post(url, json=payload, timeout=15)
            
            elapsed = round((time.time() - start_time) * 1000, 2)
            if resp.status_code == 200:
                passed = True
                response_data = resp.json()
            else:
                error_msg = f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            elapsed = round((time.time() - start_time) * 1000, 2)
            error_msg = str(e)

        status_str = "PASSED" if passed else "FAILED"
        print(f"[{status_str}] {tc_id}: {title} ({elapsed}ms)")
        if not passed:
            print(f"   Error: {error_msg}")

        results.append({
            "id": tc_id,
            "title": title,
            "passed": passed,
            "elapsed_ms": elapsed,
            "error": error_msg,
            "endpoint": endpoint,
            "payload": payload,
            "response": response_data
        })

    # Generate Markdown Summary Report
    generate_markdown_report(results)
    return results

def generate_markdown_report(results):
    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    failed_count = total - passed_count
    pass_rate = round((passed_count / total) * 100, 1)

    report = f"""# 🧪 TestSprite Automated Test Execution Report

## Executive Summary
- **Total Test Cases Executed**: {total}
- **Passed**: {passed_count}
- **Failed**: {failed_count}
- **Pass Rate**: {pass_rate}%
- **Target Backend Server**: `http://localhost:8000`
- **Target Frontend Server**: `http://localhost:5500`

---

## 📊 Detailed Test Case Results

| Test ID | Category / Title | Method & Endpoint | Latency (ms) | Result |
| :--- | :--- | :--- | :--- | :--- |
"""

    for r in results:
        status_badge = "🟢 PASSED" if r["passed"] else "🔴 FAILED"
        report += f"| **{r['id']}** | {r['title']} | `{r['endpoint']}` | {r['elapsed_ms']}ms | {status_badge} |\n"

    report += "\n---\n\n## 📝 Detailed Scenario Verification Log\n\n"

    for r in results:
        report += f"### {r['id']}: {r['title']}\n"
        report += f"- **Endpoint**: `{r['endpoint']}`\n"
        report += f"- **Status**: {'Passed' if r['passed'] else 'Failed'}\n"
        report += f"- **Latency**: {r['elapsed_ms']} ms\n"
        if r['payload']:
            report += f"- **Input Payload**: ```json\n{json.dumps(r['payload'], indent=2)}\n```\n"
        if r['response']:
            # Truncate response if too long for summary
            resp_str = json.dumps(r['response'], indent=2)
            if len(resp_str) > 500:
                resp_str = resp_str[:500] + "\n  ... (truncated for readability)"
            report += f"- **Response Sample**: ```json\n{resp_str}\n```\n"
        if r['error']:
            report += f"- **Error Detail**: `{r['error']}`\n"
        report += "\n"

    with open("testsprite_tests/testsprite_report.md", "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\n[TestSprite] Report successfully saved to testsprite_tests/testsprite_report.md!")

if __name__ == "__main__":
    run_all_tests()
