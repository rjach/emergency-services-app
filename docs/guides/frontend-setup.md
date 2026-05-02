# Frontend Setup Guide (Plain HTML/CSS/JS)

This frontend is intentionally simple.

## 1) Open a new terminal tab

Keep backend running in first tab.

## 2) Go to frontend folder

```bash
cd /Users/rjach/Stuffs/emergency-services-app/frontend
```

## 3) Start local static server

```bash
python3 -m http.server 5500
```

## 4) Open frontend in browser

- <http://localhost:5500>

You should see the starter page with button **Check Backend Health**.

## 5) Verify frontend-backend connection

1. Confirm backend is running at `http://localhost:8848`
2. In frontend page click **Check Backend Health**
3. JSON should appear on page

## If button fails

- Check backend terminal for errors
- Check browser Developer Tools -> Console and Network
- Ensure backend URL in `frontend/script.js` matches backend port
