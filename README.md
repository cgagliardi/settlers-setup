# Settlers Setup

**Looking to use Settlers Setup? Visit [settlerssetup.com](https://www.settlerssetup.com/)**

Settlers Setup attempts to create "balanced" Settlers of Catan boards. Balanced means that resources are evenly distributed across the board, and the roll numbers are distributed to such that
each corner is as close in value to other corners as possible.

Settlers Setup is in no way affiliated with Mayfair Games or Klaus Teuber, of whom Settlers of Catan is a registered trademark.

## The code

This project is implemented in TypeScript using Angular for the UI. The algorithm and datastructures
are in `src/app/board/`. This directory does not have any Angular specific dependencies. The algorithm itself is in `src/app/board/strategy/balanced-strategy.ts`.

The standard and expansion boards are defined in `src/app/board/board-specs.ts`. In order to add support for Seafarers, a number of changes would be required in `board.ts` and the rendering code `catan-board.component.ts`, which makes several assumptions about the standard hex shape of the board.

All of the rendering is done in `src/app/components/catan-board/catan-board.component.ts`.

## Debugging

To see debugging information, add `?debug=1` to the URL. This will render the score values for every corner and hex. Clicking a hex or corner will log information to the console.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
