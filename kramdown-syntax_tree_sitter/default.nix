{ pkgs ? import <nixpkgs> {}, ruby ? pkgs.ruby }:

let
  rootSrc = pkgs.fetchFromGitHub {
    owner = "andrewtbiehl";
    repo = "kramdown-syntax_tree_sitter";
    rev = "dac06f9a94c70f3d22333b7479bedd3ada354e81";
    hash = "sha256-UcF93cWQPdr6nlNCzpKsjJkl2jbOWfm4k8cDI9aOr6A=";
  };

  update-cargo-lock = ./update-cargo-lock.patch;
  update-cargo-toml = ./update-cargo-toml.patch;
  update-src = ./update-src.patch;
  rustDylib = pkgs.rustPlatform.buildRustPackage {
    pname = "kramdown-syntax_tree_sitter-rust";
    version = "v0.6.0";

    src = "${rootSrc}/ext/tree_sitter_adapter";

    cargoPatches = [ update-cargo-lock ];
    patches = [ update-cargo-toml update-src ];

    buildInputs = [ pkgs.rustPlatform.bindgenHook ];

    postInstall = ''
      # necessary for rutie to find the binary
      mkdir -p $out/target/release
      ln -s $out/lib/libtree_sitter_adapter.dylib $out/target/release/libtree_sitter_adapter.dylib
      ln -s $out/lib/libtree_sitter_adapter.so $out/target/release/libtree_sitter_adapter.so
    '';

    cargoHash = "sha256-wsOPrtZXZS7C8YQ2krY0APGfzs57nho+3bI7JzUoSFo=";
    useFetchCargoVendor = true;

    RUST_BACKTRACE = "full";
    RUBY = "${ruby}/bin/ruby";
  };
in
  pkgs.buildRubyGem {
    pname = "kramdown-syntax_tree_sitter";
    version = "latest";

    gemName = "kramdown-syntax_tree_sitter";

    src = rootSrc;

    patchPhase = ''
      runHook prePatch

      cat << EOF > ext/tasks.rake
      namespace :extensions do
        desc 'Already built with Nix'
        task :build do
          print 'Already built with Nix'
        end
      end
      EOF
      substituteInPlace "lib/tree_sitter_adapter.rb" --replace-fail "File.expand_path(File.join(__dir__, '..', 'ext', 'tree_sitter_adapter', 'target'))" "'${rustDylib}/lib'"

      patch -p1 <${./language-liquid.patch}
      cat lib/kramdown/syntax_tree_sitter/languages.rb

      runHook postPatch
    '';
  }
