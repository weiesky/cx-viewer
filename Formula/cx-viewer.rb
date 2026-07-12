# frozen_string_literal: true

# Homebrew formula for the CX-Viewer Codex monitoring CLI.
class CxViewer < Formula
  desc "Real-time request monitor and web interface for OpenAI Codex"
  homepage "https://github.com/weiesky/cx-viewer"
  url "https://registry.npmjs.org/cx-viewer/-/cx-viewer-1.0.4.tgz"
  sha256 "20f0bc5fd2fc63ecea9dd2474cb2b03748ebf769b2ef5d47b435bbef688e008c"
  license "MIT"

  depends_on "python" => :build
  depends_on "node"

  def install
    system "npm", "install", *std_npm_args, "--omit=dev"

    prebuilds = libexec/"lib/node_modules/cx-viewer/node_modules/node-pty/prebuilds"
    platform = OS.mac? ? "darwin" : "linux"
    arch = Hardware::CPU.arm? ? "arm64" : "x64"
    keep = "#{platform}-#{arch}"
    prebuilds.children.each { |path| rm_r(path) if path.basename.to_s != keep } if prebuilds.exist?

    bin.install_symlink libexec.glob("bin/*")
  end

  def caveats
    <<~EOS
      CX Viewer requires the OpenAI Codex CLI. If it is not installed yet, run:
        brew install --cask codex
    EOS
  end

  test do
    node = Formula["node"].opt_bin/"node"
    output = shell_output("#{bin}/cxv run -- #{node} -p process.env.CXV_DIRECT_MODE")
    assert_equal "1", output.strip
  end
end
