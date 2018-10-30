import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Board, ResourceType, Dimensions, Hex, Corner, Coordinate, Beach } from '../board/board';
import { PaperScope, Project, Path, Point } from 'paper';
import { assert } from '../assert';


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

function getCornerPoint(corner: Coordinate): Point {
  const xFactor = (corner.x + corner.y) % 2 ? 0 : HEX_CORNER_HEIGHT;
  return new Point(
      corner.x * HEX_DIMS.width / 2 + BOARD_OFFSET.x,
      corner.y * (HEX_SIDE_HEIGHT + HEX_CORNER_HEIGHT) + xFactor + BOARD_OFFSET.y);
}

function toPoints(arr: number[]): Point[] {
  assert(arr.length % 2 === 0);
  const points = new Array(arr.length / 2);
  for (let i = 0; i < arr.length; i++) {
    points[i / 2] = new Point(arr[i], arr[i + 1]);
  }
  return points;
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
  @ViewChild('canvas') canvas;
  scope: PaperScope;
  project: Project;

  constructor() { }

  ngOnInit() {
    const dims = this.board.dimensions;
    const canvasEl = this.canvas.nativeElement;
    canvasEl.width = dims.width * HEX_DIMS.width + BOARD_OFFSET.x * 2;
    canvasEl.height = dims.height * HEX_DIMS.height + HEX_DIMS.height + BOARD_OFFSET.y * 2;

    this.scope = new PaperScope();
    this.project = new Project(canvasEl);

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

  private renderHex(hex: Hex): Path {
    const path = new Path(toPoints([
        0, HEX_CORNER_HEIGHT, // NW
        HEX_DIMS.width / 2, 0, // N
        HEX_DIMS.width, HEX_CORNER_HEIGHT,  /// NE
        HEX_DIMS.width, HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT,  // SE
        HEX_DIMS.width / 2, HEX_DIMS.height,  // S
        0, HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT,  // SW
        0, HEX_CORNER_HEIGHT, // NW
    ]));
    path.fillColor = getColor(hex.resource);
    path.strokeColor = 'black';
    path.strokeWidth = 1;
    path.position = new Point(
      HEX_DIMS.width / 2 * hex.x + BOARD_OFFSET.x + HEX_DIMS.width / 2,
      (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * hex.y + BOARD_OFFSET.y + HEX_DIMS.height / 2);
    return path;
  }

  private renderCorner(corner: Corner): Path {
    const circle = new Path.Circle(getCornerPoint(corner), 5);
    circle.fillColor = 'black';
    circle.onClick = () => console.log(corner);
    return circle;
  }

  private renderBeach(beach: Beach) {
    // Start with the points along hte board.
    const points = beach.corners.map(getCornerPoint);
    const path = new Path(points);
    path.fillColor = '#64B5F6';
  }
}
