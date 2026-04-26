# CDP Utils — 共享工具函数

所有 task 文件在使用 CDP 时应引用本文件中的代码模式，保持一致性。

## 基础规则

- **只用 Raw CDP**（WebSocket to `127.0.0.1:9222`）
- **禁止 Playwright** — Cloudflare 检测
- **禁止 Windows MCP** — 开销太大
- **禁止点击 Submit/Send/Buy 等不可逆按钮**

## 依赖

```bash
pip install websockets
```

## Chrome CDP 配置

```python
import websockets, json, asyncio, urllib.request, time, os, subprocess

CDP_PORT = 9222
CDP_HTTP = f"http://127.0.0.1:{CDP_PORT}"
PROFILE_DIR = os.path.expandvars(r"%LOCALAPPDATA%\Chrome-CDP-Profile")
```

## Auto-launch Chrome

```python
def ensure_chrome_cdp():
    """Start Chrome with CDP if not already running."""
    try:
        with urllib.request.urlopen(f"{CDP_HTTP}/json/version", timeout=2) as r:
            return  # already running
    except Exception:
        pass
    os.makedirs(PROFILE_DIR, exist_ok=True)
    subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={PROFILE_DIR}",
        "--remote-allow-origins=*",
        "--no-first-run", "--no-default-browser-check",
        "https://www.upwork.com",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(25):
        time.sleep(1)
        try:
            urllib.request.urlopen(f"{CDP_HTTP}/json/version", timeout=2)
            return
        except Exception:
            pass
    raise RuntimeError("CDP did not start after 25 seconds")
```

## Connect to Tab

```python
def get_tab_ws():
    """Get WebSocket URL for a page tab."""
    with urllib.request.urlopen(f"{CDP_HTTP}/json") as r:
        tabs = json.loads(r.read())
    tab = next(t for t in tabs if t["type"] == "page" and t.get("webSocketDebuggerUrl"))
    return tab["webSocketDebuggerUrl"]
```

## CDPSession Class

```python
class CDPSession:
    def __init__(self, ws):
        self.ws = ws
        self._id = 0

    async def send(self, method, params=None):
        self._id += 1
        msg = {"id": self._id, "method": method}
        if params:
            msg["params"] = params
        await self.ws.send(json.dumps(msg))
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=30)
            data = json.loads(raw)
            if data.get("id") == self._id:
                if "error" in data:
                    raise Exception(f"CDP error: {data['error']}")
                return data.get("result", {})

    async def navigate(self, url, wait_secs=3):
        await self.send("Page.enable")
        await self.send("Page.navigate", {"url": url})
        # Wait for load event
        deadline = time.time() + 15
        while time.time() < deadline:
            try:
                data = json.loads(await asyncio.wait_for(self.ws.recv(), 1))
                if data.get("method") in ("Page.loadEventFired", "Page.frameStoppedLoading"):
                    break
            except asyncio.TimeoutError:
                pass
        await asyncio.sleep(wait_secs)
        # Wait for Cloudflare
        await self.wait_cloudflare()

    async def evaluate(self, expression):
        result = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        })
        return result.get("result", {}).get("value")

    async def get_title(self):
        return await self.evaluate("document.title")

    async def wait_cloudflare(self, timeout=25):
        for i in range(timeout):
            title = await self.get_title()
            if title and "稍候" not in title and "moment" not in title.lower():
                return True
            await asyncio.sleep(1)
        return False
```

## Session Check — 登录状态检测

每个 task 开始时必须运行：

```python
async def check_login(cdp):
    """Navigate to Upwork and verify logged-in state."""
    await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches")
    page_text = await cdp.evaluate("document.body.innerText.slice(0, 500)")
    if not page_text:
        return "error", "Empty page — CDP may not be connected"
    if "Log In" in page_text or "Sign Up" in page_text:
        return "expired", "Session expired — user must re-login in CDP Chrome"
    if "稍候" in page_text or "moment" in page_text.lower():
        return "cloudflare", "Stuck on Cloudflare — wait and retry"
    return "ok", page_text
```

## Notification Check — 消息/通知检测

```python
async def check_notifications(cdp):
    """Check for unread messages and notifications on current page."""
    result = await cdp.evaluate("""
        JSON.stringify({
            messages: document.querySelector('[data-test="messages-count"]')?.textContent?.trim() || '0',
            notifications: document.querySelector('[data-test="notifications-count"]')?.textContent?.trim() || '0',
            hasMessageBadge: !!document.querySelector('.nav-item .badge, [data-test="message-badge"]'),
        })
    """)
    return json.loads(result) if result else {"messages": "0", "notifications": "0"}
```

## React-Compatible Input Fill

Upwork 用 React，普通 `.value = x` 不会触发状态更新。必须用 native setter：

```python
async def fill_input(cdp, selector, value):
    """Fill an input/textarea using React-compatible native setter."""
    escaped_value = json.dumps(value)
    return await cdp.evaluate(f"""
    (() => {{
        const el = document.querySelector('{selector}');
        if (!el) return 'not found: {selector}';
        el.focus();
        const proto = el.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, {escaped_value});
        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
        el.dispatchEvent(new Event('blur', {{ bubbles: true }}));
        return 'filled: ' + el.value.length + ' chars';
    }})()
    """)
```

## Standard Task Header

每个 task 的 Step 1 应包含以下标准检查：

```python
# 1. Ensure CDP is running
ensure_chrome_cdp()

# 2. Connect to tab
ws_url = get_tab_ws()
async with websockets.connect(ws_url, max_size=10_000_000) as ws:
    cdp = CDPSession(ws)
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")

    # 3. Verify login
    status, info = await check_login(cdp)
    if status != "ok":
        print(f"STOP: {info}")
        sys.exit(1)

    # 4. Check notifications
    notifs = await check_notifications(cdp)
    if int(notifs.get("messages", "0")) > 0:
        print(f"⚠ Unread messages: {notifs['messages']}")

    # ... task-specific logic ...
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CDP won't start | Must use `--user-data-dir` to avoid Chrome single-instance merging |
| Cloudflare "请稍候" | Wait up to 25s, auto-resolves. Visit main page first to warm cookie |
| Need login | Log into Upwork in CDP Chrome manually. Cookies persist in profile |
| Empty extraction | DOM selectors may have changed. Use `document.body.innerText` to inspect |
| Port 9222 in use | Another CDP Chrome running. Reuse it or kill and restart |
| React input not updating | Use `nativeInputValueSetter` pattern from `fill_input` above |
