import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Board, ResourceType, Dimensions, Hex, Corner, Coordinate, Beach } from '../board/board';
import * as SVG from 'svg.js';

// Stands for grid size. This is also the length of a hex size.
const HEX_SIDE_HEIGHT = 50;

// In order to render a hexegon where every side is the same, we need to figure out the height of
// the angled lines where the hypotenuse is HEX_SIDE_HEIGHT. An even sided hexagon has 120 degree
// angles all over, so we use 60 degrees to represent the right triangle that is one of our slanted
// lines.
const RAD_60_DEG = 60 * Math.PI / 180; // 60 degrees in Radians
const HEX_CORNER_HEIGHT = HEX_SIDE_HEIGHT * Math.cos(RAD_60_DEG);
const HEX_DIMS = {
  width: HEX_SIDE_HEIGHT * Math.sin(RAD_60_DEG) * 2,
  height: HEX_CORNER_HEIGHT * 2 + HEX_SIDE_HEIGHT
};
const BOARD_OFFSET = { x: 50, y: 50 };

function getCornerRenderCoords(corner: Coordinate): Coordinate {
  const xFactor = (corner.x + corner.y) % 2 ? 0 : HEX_CORNER_HEIGHT;
  return {
    x: corner.x * HEX_DIMS.width / 2 + BOARD_OFFSET.x,
    y: corner.y * (HEX_SIDE_HEIGHT + HEX_CORNER_HEIGHT) + xFactor + BOARD_OFFSET.y,
  };
}

function getColor(resource: ResourceType): string {
  // Material design colors.
  // See https://material.io/design/color/the-color-system.html
  switch (resource) {
    case ResourceType.BRICK:
      return '#C62828';
    case ResourceType.DESERT:
      return '#795548';
    case ResourceType.ORE:
      return '#B0BEC5';
    case ResourceType.SHEEP:
      return '#B2FF59';
    case ResourceType.WHEAT:
      return '#FFEE58';
    case ResourceType.WOOD:
      return '#33691E';
  }
  return 'black';
}


@Component({
  selector: 'app-catan-board',
  templateUrl: './catan-board.component.html',
  styleUrls: ['./catan-board.component.css']
})
export class CatanBoardComponent implements OnInit {
  @Input() board: Board;
  @ViewChild('container') container;
  draw: SVG.Doc;

  constructor() { }

  ngOnInit() {
    if (!SVG.supported) {
      alert('Sorry, your browser is too old for this.');
      return;
    }
    const dims = this.board.dimensions;
    this.draw = SVG(this.container.nativeElement)
        .size(dims.width * HEX_DIMS.width + BOARD_OFFSET.x * 2,
              dims.height * HEX_DIMS.height + HEX_DIMS.height + BOARD_OFFSET.y * 2);

    for (const beach of this.board.beaches) {
      this.renderBeach(beach);
    }

    for (const hex of this.board.hexes) {
      this.renderHex(hex);
    }

    for (const corner of this.board.corners) {
      this.renderCorner(corner);
    }
  }

  private renderHex(hex: Hex): SVG.Polygon {
    return this.draw.polygon([
      0, HEX_CORNER_HEIGHT, // NW
      HEX_DIMS.width / 2, 0, // N
      HEX_DIMS.width, HEX_CORNER_HEIGHT,  /// NE
      HEX_DIMS.width, HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT,  // SE
      HEX_DIMS.width / 2, HEX_DIMS.height,  // S
      0, HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT,  // SW
      ]).fill(getColor(hex.resource))
        .stroke({ color: 'black', width: 1 })
        .move(HEX_DIMS.width / 2 * hex.x + BOARD_OFFSET.x,
              (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * hex.y + BOARD_OFFSET.y);
  }

  private renderCorner(corner: Corner): SVG.Circle {
    const coords = getCornerRenderCoords(corner);
    return this.draw.circle(10)
        .fill('black')
        .attr({ cx: coords.x, cy: coords.y})
        .click(() => console.log(corner));
  }

  private renderBeach(beach: Beach) {
    // Start with the points along hte board.
    const points = beach.corners.map(getCornerRenderCoords).map(c => [c.x, c.y]);
    this.draw.polygon(points).fill('#64B5F6');
  }
}
