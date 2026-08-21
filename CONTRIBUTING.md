# Contributing

Hey, welcome to the party! 🎉

Thank you so much for your interest in contributing to MarketBot!


## Asking questions, suggesting wonderful ideas or reporting bugs

You can [submit an issue️](https://github.com/Ionaru/MarketBot/issues) on this GitHub repository.


## Coding

### 📦 Prerequisites

You need Node.js 24 or newer and npm.

Install Node.js from [the official Node.js website](https://nodejs.org/en/download/), or with a
version manager such as [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm).

The `/history` command renders a graph with Puppeteer, which needs a Chromium. If you intend to work
on that command, install one:

```bash
npx puppeteer browsers install chrome
```

Everything else runs without it.


### 🏗️ Installation

First, clone this repository:

```bash
git clone https://github.com/Ionaru/MarketBot.git
cd MarketBot
```

Then install the required dependencies:

```bash
npm ci
```

Finally, create your configuration file and fill in your Discord credentials:

```bash
cp config/marketbot.template.ini config/marketbot.ini
```

Yay! You are ready! 🍾

Run the bot with `npm start`, which compiles the TypeScript and runs the result.


### 🧪 Checks

```bash
npm test       # Lint and run the unit tests
npm run build  # Compile TypeScript to dist/
```

`npm test` runs the linter first through its `pretest` hook, so it covers both.


### ⤴️ Pull requests

Please make sure any code you submit is compliant and compatible with this repository's [license](./LICENSE).

#### Your first pull request
1. [Create a fork of this project](https://github.com/Ionaru/MarketBot/fork).
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/MarketBot.git`.
3. Add the original repository as remote to keep it up-to-date: `git remote add upstream https://github.com/Ionaru/MarketBot.git`.
4. Fetch the latest changes from upstream: `git fetch upstream`.
5. Create a new branch to work on: `git checkout -b MyNewFeatureName`.
6. Write some awesome improvements, tests and commit your work.
7. Make sure your changes comply with the established code: `npm test`.
8. Push your changes to GitHub: `git push origin`.
9. On GitHub, go to your forked branch, and click **New pull request**.
10. Choose the correct branches, add a description and submit your pull request!

#### Continuing development
To create more pull requests, please follow the steps below:
1. Go back to the master branch: `git checkout master`.
2. Fetch the upstream changes: `git fetch upstream`.
3. Update the master branch with upstream changes: `git merge upstream/master`.
4. Repeat ["Your first pull request"](#your-first-pull-request) from step 5.

Thank you! 💜
