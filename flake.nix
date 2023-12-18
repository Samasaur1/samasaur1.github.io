{
  description = "A very basic flake";

  outputs = { self, nixpkgs }:
    let
    allSystems = nixpkgs.lib.systems.flakeExposed;
  forAllSystems = nixpkgs.lib.genAttrs allSystems;
  in {
    devShells = forAllSystems (system:
      let gems = nixpkgs.legacyPackages.${system}.bundlerEnv {
        name = "web gems";
        gemdir = ./.;
      }; in
        {
        default = nixpkgs.legacyPackages.${system}.mkShell {
          packages = [ gems gems.wrappedRuby nixpkgs.legacyPackages.${system}.git ];
          # shellHook = ''
          #   export DEBUG=1
          # '';
        };
        }
    );
  };
}
