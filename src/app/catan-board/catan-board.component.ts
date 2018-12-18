import { Component, OnInit, Input, ViewChild, OnChanges } from '@angular/core';
import { Board, ResourceType, Dimensions, Hex, Corner, Coordinate, Beach, Port, getNumDots } from '../board/board';
import { PaperScope, Project, Path, Point, PointText, TextItem, Group, Item, Shape } from 'paper';
import { assert } from '../assert';
import { preserveWhitespacesDefault } from '@angular/compiler';
import * as _ from 'lodash';


// Stands for grid size. This is also the length of a hex size.
const HEX_SIDE_HEIGHT = 60;
// Distance of the beach from the corner of the board.
const BEACH_DISTANCE = 60;
// Distance of border numbers from the border lines.
const BEACH_NUMBER_DISTANCE = 15;
// The diameter of the circle that shows the roll number.
const ROLL_NUMBER_SIZE = 25;

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
const BOARD_OFFSET = { x: BEACH_DISTANCE * 1.5 + 5, y: BEACH_DISTANCE + 5 };

function toPoints(arr: number[]): Point[] {
  assert(arr.length % 2 === 0);
  const points = new Array(arr.length / 2);
  for (let i = 0; i < arr.length; i++) {
    points[i / 2] = new Point(arr[i], arr[i + 1]);
  }
  return points;
}

// Given 2 points, create a new point that's deg off from start-to-end, and dist away from start.
function getPointFromLine(start: Point, end: Point, deg: number, dist: number): Point {
  const vector = start.subtract(end);
  vector.length = dist;
  vector.angle = vector.angle + deg;
  return start.add(vector);
}

function averagePoints(p1: Point, p2: Point): Point {
  return p1.add(p2).divide(2);
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

interface TextOpts {
  size?: number;
  color?: string;
  bold?: boolean;
}

interface SizeAndScale {
  width: number;
  height: number;
  scale: number;
}

@Component({
  selector: 'app-catan-board',
  templateUrl: './catan-board.component.html',
  styleUrls: ['./catan-board.component.scss']
})
export class CatanBoardComponent implements OnChanges {
  @Input() board: Board;
  @ViewChild('canvas') canvas;
  @ViewChild('container') container;
  scope: PaperScope;
  project: Project;
  private showStats = false;
  private sizeAndScale: SizeAndScale;

  constructor() {
    this.scope = new PaperScope();
  }

  ngOnChanges() {
    this.sizeAndScale = this.calculateDimensions();
    this.drawBoard();
  }

  toggleStats() {
    this.showStats = !this.showStats;
    this.drawBoard();
  }

  onResize(event) {
    const sizeAndScale = this.calculateDimensions();
    if (this.sizeAndScale.width === sizeAndScale.width) {
      return;
    }
    this.sizeAndScale = sizeAndScale;
    this.drawBoard();
  }

  drawBoard() {
    const canvasEl = this.canvas.nativeElement;
    canvasEl.width = this.sizeAndScale.width;
    canvasEl.height = this.sizeAndScale.height;

    if (this.project) {
      this.project.remove();
      canvasEl.setAttribute('style', '');
    }
    this.project = new Project(canvasEl);

    for (const beach of this.board.beaches) {
      this.renderBeach(beach);
    }

    for (const hex of this.board.hexes) {
      this.renderHex(hex);
    }

    if (this.showStats) {
      for (const corner of this.board.corners) {
        this.renderCorner(corner);
      }
    }
  }

  private calculateDimensions(): SizeAndScale {
    const dims = this.board.dimensions;
    const fullWidth = dims.width * HEX_DIMS.width + BOARD_OFFSET.x * 2;
    const fullHeight = dims.height * (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT)
        + HEX_CORNER_HEIGHT + BOARD_OFFSET.y * 2;
    // debugger;

    const containerWidth = this.container.nativeElement.clientWidth;
    const ratio = containerWidth >= fullWidth ? 1 :
        containerWidth / fullWidth;
    return {
      width: fullWidth * ratio,
      height: fullHeight * ratio,
      scale: ratio,
    };
  }

  private renderHex(hex: Hex): Item {
    const scale = this.sizeAndScale.scale;
    const group = new Group();

    const path = new Path(toPoints([
        0, HEX_CORNER_HEIGHT * scale, // NW
        HEX_DIMS.width / 2 * scale, 0, // N
        HEX_DIMS.width * scale, HEX_CORNER_HEIGHT * scale,  /// NE
        HEX_DIMS.width * scale, (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * scale,  // SE
        HEX_DIMS.width / 2 * scale, HEX_DIMS.height * scale,  // S
        0, (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * scale,  // SW
        0, HEX_CORNER_HEIGHT * scale, // NW
    ]));
    path.fillColor = getColor(hex.resource);
    path.strokeColor = 'black';
    path.strokeWidth = 1;

    group.addChild(path);

    if (hex.rollNumber) {
      const rollNum = this.renderRollNumber(hex.rollNumber);
      rollNum.position.x = HEX_DIMS.width /  2 * scale;
      rollNum.position.y = HEX_DIMS.height /  2 * scale;
      group.addChild(rollNum);
    }

    if (this.showStats) {
      const score = this.renderText(_.round(hex.score, 1) + '',
          new Point(HEX_DIMS.width /  2 * scale, 18 * scale));
      group.addChild(score);
    }

    group.position = new Point(
      (HEX_DIMS.width / 2 * hex.x + BOARD_OFFSET.x + HEX_DIMS.width / 2) * scale,
      ((HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * hex.y + BOARD_OFFSET.y + HEX_DIMS.height / 2)
          * scale);

    group.onClick = () => {
      const details = {x: hex.x, y: hex.y, score: hex.score};
      console.log('Hex', details);
    };

    return group;
  }

  private renderRollNumber(rollNum: number): Item {
    const scale = this.sizeAndScale.scale;
    const group = new Group();

    const color = rollNum === 6 || rollNum === 8 ? 'red' : 'black';
    const point = new Point(0, 0);

    const circle = Shape.Circle(point, ROLL_NUMBER_SIZE * scale);
    circle.fillColor = '#FFECB3';
    circle.strokeColor = 'black';
    circle.strokeWidth = 1;
    group.addChild(circle);

    const text = this.renderText(rollNum + '', new Point(0, -2), { color, size: 19, bold: true });
    group.addChild(text);

    const dotsGroup = new Group();
    const numDots = getNumDots(rollNum);
    for (let i = 0; i < numDots; i++) {
      const dot = Shape.Circle(new Point(i * 4 * scale, 0), 1 * scale);
      dot.fillColor = color;
      dotsGroup.addChild(dot);
    }
    group.addChild(dotsGroup);
    dotsGroup.position.y = 16 * scale;
    dotsGroup.position.x -= (numDots / 2 * 4 - 2) * scale;

    return group;
  }

  private renderCorner(corner: Corner): Path {
    const scale = this.sizeAndScale.scale;
    const group = new Group();

    const point = this.getCornerPoint(corner);
    const circle = new Path.Circle(point, 10 * scale);
    circle.fillColor = 'black';
    group.addChild(circle);

    const text = this.renderText(_.round(corner.score, 1) + '',
                                 point, {color: 'white', size: 8});
    group.addChild(text);

    group.onClick = () => {
      console.log(corner);
      if (window['corners']) {
        window['corners'].push(corner);
      }
    };

    return circle;
  }

  private renderBeach(beach: Beach) {
    const scale = this.sizeAndScale.scale;
    // Start with the points along the board.
    const beachPoints = beach.corners.map(c => this.getCornerPoint(c));
    const points = beachPoints.slice();

    const outerRight =
        getPointFromLine(points[points.length - 1], points[points.length - 2], -60,
          BEACH_DISTANCE * scale);
    const farPointRight =
        getPointFromLine(outerRight, points[points.length - 1], -90, BEACH_DISTANCE * 100 * scale);
    const rightPath = new Path([outerRight, farPointRight]);

    const outerLeft = getPointFromLine(points[0], points[1], 60, BEACH_DISTANCE * scale);
    const farLeftPoint =
        getPointFromLine(outerLeft, points[0], 90, BEACH_DISTANCE * 100 * scale);
    const leftPath = new Path([outerLeft, farLeftPoint]);

    // Math is hard.
    // To find where outerMiddle should be, we create 2 90 degree lines from the edge of the other
    // outer points and then find the intersection of those lines.
    const outerMiddle = rightPath.getIntersections(leftPath)[0].point;

    points.push(outerRight, outerMiddle, outerLeft);

    const path = new Path(points);
    path.fillColor = '#64B5F6';
    path.strokeColor = 'black';
    path.strokeWidth = 1;
    path.closed = true;

    this.renderBeachNumber(beach.connections[0], beachPoints[0], outerLeft, true);
    this.renderBeachNumber(beach.connections[1], beachPoints[beachPoints.length - 1], outerRight,
        false);

    beach.ports.forEach(this.renderPort.bind(this));
  }

  private renderBeachNumber(value: number, beachPoint: Point, outerPoint: Point, first: boolean) {
    const scale = this.sizeAndScale.scale;
    let point = averagePoints(beachPoint, outerPoint);
    point = getPointFromLine(point, outerPoint, first ? -90 : 90, BEACH_NUMBER_DISTANCE * scale);
    this.renderText(value + '', point);
  }

  private renderPort(port: Port) {
    const scale = this.sizeAndScale.scale;
    const portPoints = port.corners.map(c => this.getCornerPoint(c));
    const iconPoint = getPointFromLine(portPoints[0], portPoints[1], 120, HEX_SIDE_HEIGHT * scale);

    this.renderText(port.resource, iconPoint, {bold: true, color: getColor(port.resource)});

    portPoints.forEach(portPoint => {
      const line = new Path([portPoint, averagePoints(portPoint, iconPoint)]);
      line.strokeColor = '#4E342E';
      line.strokeWidth = 4 * scale;
    });
  }

  private getCornerPoint(corner: Coordinate): Point {
    const scale = this.sizeAndScale.scale;
    const xFactor = (corner.x + corner.y + this.board.dimensions.width + 1) % 2 ?
        0 : HEX_CORNER_HEIGHT;
    return new Point(
        (corner.x * HEX_DIMS.width / 2 + BOARD_OFFSET.x) * scale,
        (corner.y * (HEX_SIDE_HEIGHT + HEX_CORNER_HEIGHT) + xFactor + BOARD_OFFSET.y) * scale);
  }

  // Renders text centered over a point.
  private renderText(content: string, center: Point, opts: TextOpts = {}) {
    let size = opts.size || 12;
    size *= this.sizeAndScale.scale;
    const textPoint = new Point(center);
    textPoint.y += size / 2;
    const label = new PointText(textPoint);
    label.content = content;
    label.fontSize = size + 'px';
    if (opts.bold) {
      label.fontWeight = 'bold';
    }
    label.fillColor = opts.color || 'black';
    label.justification = 'center';
    return label;
  }
}
