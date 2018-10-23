import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Board, ResourceType, Dimensions } from '../board/board';
import * as SVG from 'svg.js';

// Stands for grid size. This is also the length of a hex size.
const GS = 50;

const HEX_CORNER_HEIGHT = GS * .333;
const HEX_DIMS = {
  width: GS * 1.3,
  height: HEX_CORNER_HEIGHT * 2 + GS
};

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
        .size(dims.width * HEX_DIMS.width, dims.height * HEX_DIMS.height + HEX_DIMS.height);
    for (const boardHex of this.board.getAllHexes()) {
      const hexPolygon = this.draw.polygon([
        0, HEX_CORNER_HEIGHT, // NW
        HEX_DIMS.width / 2, 0, // N
        HEX_DIMS.width, HEX_CORNER_HEIGHT,  /// NE
        HEX_DIMS.width, HEX_CORNER_HEIGHT + GS,  // SE
        HEX_DIMS.width / 2, HEX_DIMS.height,  // S
        0, HEX_CORNER_HEIGHT + GS,  // SW
        ]).fill(getColor(boardHex.resource))
          .stroke({ color: 'black', width: 1 })
          .move(HEX_DIMS.width / 2 * boardHex.x, (HEX_CORNER_HEIGHT + GS) * boardHex.y);
    }
  }

}
