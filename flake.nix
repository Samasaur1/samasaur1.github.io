{
  description = "A very basic flake";

  inputs.nixpkgs.url = "github:nixos/nixpkgs";

  outputs = { self, nixpkgs }:
    let
      allSystems = nixpkgs.lib.systems.flakeExposed;
      forAllSystems = nixpkgs.lib.genAttrs allSystems;
      define = f: forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
            };
          };
        in
          f pkgs);
    in {
      devShells = define (pkgs:
        let
          gemfileGems = pkgs.bundlerEnv {
            name = "web gems";
            gemdir = ./.;
          };
          kramdown = pkgs.callPackage ./kramdown-syntax_tree_sitter {};
          gems = pkgs.symlinkJoin {
            name = "gems";
            paths = [ gemfileGems kramdown ];
          };
        in {
          default = pkgs.mkShell {
            packages = [ gems pkgs.git ];
          };
        }
      );
    };
}
