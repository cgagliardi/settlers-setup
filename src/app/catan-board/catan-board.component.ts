import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Board, ResourceType, Dimensions, Hex, Corner, Coordinate } from '../board/board';
import * as SVG from 'svg.js';

// Stands for grid size. This is also the length of a hex size.
const HEX_SIDE_HEIGHT = 50;

const HEX_CORNER_HEIGHT = HEX_SIDE_HEIGHT * .333;
const HEX_DIMS = {
  width: HEX_SIDE_HEIGHT * 1.3,
  height: HEX_CORNER_HEIGHT * 2 + HEX_SIDE_HEIGHT
};
const BOARD_OFFSET = { x: 50, y: 50 };

function getCornerRenderCoords(corner: Corner): Coordinate {
  const xFactor = (corner.x + corner.y) % 2 ? 0 : HEX_CORNER_HEIGHT;
  return {
    x: corner.x * HEX_DIMS.width / 2,
    y: corner.y * (HEX_SIDE_HEIGHT + HEX_CORNER_HEIGHT) + xFactor,
  };
}

/**
 * Colors from https://clrs.cc/
 */
function getColor(resource: ResourceType): string {
  switch (resource) {
    case ResourceType.BRICK:
      return '#FF4136';
    case ResourceType.DESERT:
      return '#FF851B';
    case ResourceType.ORE:
      return '#AAAAAA';
    case ResourceType.SHEEP:
      return '#01FF70';
    case ResourceType.WHEAT:
      return '#FFDC00';
    case ResourceType.WOOD:
      return '#3D9970';
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
        .attr({ cx: coords.x + BOARD_OFFSET.x, cy: coords.y + BOARD_OFFSET.y })
        .click(() => console.log(corner));
  }
}
