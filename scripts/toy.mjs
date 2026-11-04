import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const target = 'x86_64-pc-windows-msvc'
const [command, toy, ...extra] = process.argv.slice(2)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function run() {
  if (extra.length || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(toy ?? '')) {
    throw new Error('Usage: pnpm <dev|package> <toy-name>')
  }

  const app = join(root, 'apps', toy)
  const configPath = join(app, 'src-tauri', 'tauri.conf.json')
  if (!existsSync(configPath)) throw new Error(`Unknown toy: ${toy}`)

  const cliManifestPath = fileURLToPath(import.meta.resolve('@tauri-apps/cli/package.json'))
  const cli = join(dirname(cliManifestPath), readJson(cliManifestPath).bin.tauri)
  const targetDir = join(root, 'target')

  const runTauri = (args) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: app,
      env: { ...process.env, CARGO_TARGET_DIR: targetDir },
      stdio: 'inherit',
    })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status ?? 1)
  }

  if (command === 'dev') {
    runTauri(['dev', '--', '--locked'])
    return
  }

  if (command !== 'package' || process.platform !== 'win32') {
    throw new Error('Packaging requires Windows. Usage: pnpm package <toy-name>')
  }

  const config = readJson(configPath)
  const version = readJson(resolve(dirname(configPath), config.version)).version
  const installer = `${config.productName}_${version}_x64-setup.exe`
  const source = join(targetDir, target, 'release', 'bundle', 'nsis', installer)
  const outputDir = join(root, 'artifacts', toy, version)
  const output = join(outputDir, installer)

  runTauri([
    'build', '--ci', '--target', target,
    '--config', join(root, 'scripts', 'windows-bundle.json'),
    '--', '--locked',
  ])

  mkdirSync(outputDir, { recursive: true })
  copyFileSync(source, output)
  console.log(`${output} (${(statSync(output).size / 1024 / 1024).toFixed(2)} MiB)`)
}

try {
  run()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
