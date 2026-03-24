# Terminal Basics for Beginners

If you are new to terminal, learn these commands first.

## Check current folder

```bash
pwd
```

## List files in current folder

```bash
ls
```

## Move into a folder

```bash
cd backend
```

## Move one level up

```bash
cd ..
```

## Create a file quickly

```bash
touch .env
```

## Open current folder in Cursor/VS Code

```bash
code .
```

(If `code` does not work, open editor manually.)

## Useful beginner tip

Use **Tab** key to autocomplete folder and file names.

## Project navigation example

From project root:

```bash
cd backend
npm install
npm run dev
```

Open a second terminal tab for frontend:

```bash
cd frontend
python3 -m http.server 5500
```
