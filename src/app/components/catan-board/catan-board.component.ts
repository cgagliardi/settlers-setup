import { Component, Input, ViewChild, OnChanges, ElementRef } from '@angular/core';
import { Board, ResourceType, Hex, Corner, Coordinate, Beach, Port, getNumDots } from '../../board/board';
import * as paper from 'paper';
import { assert } from '../../util/assert';
import * as bezier from 'bezier-easing';
import { findHighestBy, findLowestBy } from 'src/app/util/collections';

import clone from 'lodash/clone';
import round from 'lodash/round';
import shuffle from 'lodash/shuffle';

// ====== Render Sizing ======
// Note: the "scale factor" constants are used to slow down or speed up how much the numbers are
// scaled as they are resized for smaller displays. A smaller number means a larger rendering.

// Stands for grid size. This is also the length of a hex size.
const HEX_SIDE_HEIGHT = 60;
// Distance of the beach from the corner of the board.
const BEACH_DISTANCE = 60;
// Distance of border numbers from the border lines.
const BEACH_NUMBER_DISTANCE = 15;
const BEACH_SCALE_FACTOR = 1.3;
const BEACH_TEXT_SCALE_FACTOR = 0.9;
const PORT_BACKGROUND_RADIUS = 18;
const PORT_DISTANCE = 42;
// The diameter of the circle that shows the roll number.
const ROLL_NUMBER_SIZE = 25;
const ROLL_NUM_SCALE_FACTOR = 0.65;

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

function toPoints(arr: number[]): paper.Point[] {
  assert(arr.length % 2 === 0);
  const points = new Array(arr.length / 2);
  for (let i = 0; i < arr.length; i++) {
    points[i / 2] = new paper.Point(arr[i], arr[i + 1]);
  }
  return points;
}

// Given 2 points, create a new point that's deg off from start-to-end, and dist away from start.
function getPointFromLine(start: paper.Point, end: paper.Point, deg: number, dist: number): paper.Point {
  const vector = start.subtract(end);
  vector.length = dist;
  vector.angle = vector.angle + deg;
  return start.add(vector);
}

function average(p1: paper.Point, p2: paper.Point): paper.Point {
  return p1.add(p2).divide(2);
}

// Returns a point somewhere along the line between the two points.
// A weight of 0 will return p1. A weight of 1 will return p2.
function weightedAverage(p1: paper.Point, p2: paper.Point, weight: number): paper.Point {
  const vector = p2.subtract(p1);
  return p1.add(vector.multiply(weight));
}

const WATER_COLORS = ['#4a85d3', '#64B5F6'];

function getGradientColors(resource: ResourceType): string[] {
  switch (resource) {
    case ResourceType.BRICK:
      return ['#E53935', '#C62828', '#B71C1C'];
    case ResourceType.DESERT:
      return ['#8F6455', '#795548', '#5D4037'];
    case ResourceType.GOLD:
        return ['orange', 'yellow'];
    case ResourceType.ORE:
      return ['#CFD8DC', '#B0BEC5', '#90A4AE'];
    case ResourceType.SHEEP:
      return ['#BCFF6B', '#B2FF59', '#9EE34F'];
    case ResourceType.WATER:
        return WATER_COLORS;
    case ResourceType.WHEAT:
      return ['#FFF176', '#FFEE58', '#FFEB3B'];
    case ResourceType.WOOD:
      return ['#3A7822', '#33691E', '#295418'];
    case ResourceType.ANY:
      return ['black', '#6d6d6d'];
    default:
      return ['black', 'white'];
  }
}

function createGradient(colors: string[]): paper.Gradient {
  const gradient = new paper.Gradient();
  gradient.stops = colors.map((c, i) =>
      new paper.GradientStop(new paper.Color(c), i / colors.length));
  return gradient;
}

function getGradient(resource: ResourceType): paper.Gradient {
  return createGradient(getGradientColors(resource));
}

interface TextOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  scale?: number;
}

interface SizeAndScale {
  width: number;
  height: number;
  scale: number;
}

// Animation configuartion.
const easeOut = bezier(0.165, 0.84, 0.44, 1);
let firstRenderComplete = false;

// Describes how a list of items should be animated.
interface AnimationConfig {
  // The animation duration in seconds of a single item.
  duration: number;
  // The duration between the start of each item's animation.
  offsetDuration: number;
  // The Y distance the item should travel from its final position.
  distance: number;
  // If true, the opacity will be animated in.
  animateOpacity: boolean;

  // These values describe the animation of all of the items, and can be dependent on the size of
  // the board.
  // The time in seconds that the first animation should start.
  startTime?: number;
  // The time in seconds that the entire animation should end (includes startTime).
  totalDuration?: number;
}
const HEX_ANIM_CONFIG = {
  duration: 0.2,
  offsetDuration: 0.023,
  distance: -30,
  animateOpacity: false,
};
const ROLL_NUM_ANIM_CONFIG = {
  duration: 0.2,
  offsetDuration: 0.02,
  distance: 20,
  animateOpacity: false,
};

@Component({
  selector: 'app-catan-board',
  templateUrl: './catan-board.component.html',
  styleUrls: ['./catan-board.component.scss']
})
export class CatanBoardComponent implements OnChanges {
  @Input() board: Board;
  @Input() animationEnabled: boolean;
  @ViewChild('canvas', { static: true }) canvas: ElementRef;
  @ViewChild('container', { static: true }) container: ElementRef;
  scope: paper.PaperScope;
  project: paper.Project;
  // To toggle showStats add ?debug=1 to the URL.
  private showStats = !!location.search.match(/(\?|&)debug=[^&]+/);
  private sizeAndScale: SizeAndScale;

  private hexItems: paper.Item[];
  private rollNumItems: Array<paper.Item|null>;
  private finalHexYs: number[];
  private hexAnimConfig: AnimationConfig;
  private rollNumAnimConfig: AnimationConfig;
  private animationComplete: boolean;

  constructor() {
    this.scope = new paper.PaperScope();
  }

  ngOnChanges() {
    this.sizeAndScale = this.calculateDimensions();
    this.drawBoard();
  }

  onResize() {
    const sizeAndScale = this.calculateDimensions();
    if (this.sizeAndScale.width === sizeAndScale.width) {
      return;
    }
    this.sizeAndScale = sizeAndScale;
    this.drawBoard(false /* animate */);
  }

  drawBoard(animate = this.animationEnabled) {
    const canvasEl = this.canvas.nativeElement;
    canvasEl.width = this.sizeAndScale.width;
    canvasEl.height = this.sizeAndScale.height;

    if (this.project) {
      this.project.remove();
      canvasEl.setAttribute('style', '');
    }
    this.project = new paper.Project(canvasEl);

    for (const hex of this.board.hexes) {
      if (this.board.isResourceImmutable(hex)) {
        this.renderHex(hex);
      }
    }
    for (const beach of this.board.beaches) {
      this.renderBeach(beach);
    }
    for (const port of this.board.ports) {
      this.renderPort(port);
    }

    // The hexes & rollNumbers are rendered in a random order so that they can be animated in
    // randomly.
    let placementOrder = [];
    for (let i = 0; i < this.board.mutableHexes.length; i++) {
      placementOrder.push(i);
    }
    placementOrder = shuffle(placementOrder);

    this.hexItems = [];
    this.rollNumItems = [];
    this.finalHexYs = [];
    for (const i of placementOrder) {
      const hex = this.board.mutableHexes[i];
      const [item, rollNumber] = this.renderHex(hex);
      this.hexItems.push(item);
      this.rollNumItems.push(rollNumber);
      this.finalHexYs.push(item.position.y);
    }

    if (this.board.spec.dragons) {
      this.renderDragons();
    }

    if (this.showStats) {
      const bestCorner = findHighestBy(this.board.corners, c => c.score);
      const worstCorner = findLowestBy(this.board.corners, c => c.score);

      for (const corner of this.board.corners) {
        this.renderCorner(corner, bestCorner === corner, worstCorner === corner);
      }
    }

    if (animate) {
      this.configureAnimation();
    } else {
      this.project.view.onFrame = () => {};
    }
  }

  private calculateDimensions(): SizeAndScale {
    const dims = this.board.dimensions;
    const fullWidth = dims.width * HEX_DIMS.width + BOARD_OFFSET.x * 2;
    const fullHeight = dims.height * (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT)
        + HEX_CORNER_HEIGHT + BOARD_OFFSET.y * 2;

    const containerWidth = this.container.nativeElement.clientWidth;
    const ratio = containerWidth >= fullWidth ? 1 :
        containerWidth / fullWidth;
    return {
      width: fullWidth * ratio,
      height: fullHeight * ratio,
      scale: ratio,
    };
  }

  private renderHex(hex: Hex): [paper.Item, paper.Item|null] {
    if (!hex.resource) {
      return [new paper.Group(), null];
    }
    const scale = this.sizeAndScale.scale;
    const group = new paper.Group();

    const path = new paper.Path(toPoints([
        0, HEX_CORNER_HEIGHT * scale, // NW
        HEX_DIMS.width / 2 * scale, 0, // N
        HEX_DIMS.width * scale, HEX_CORNER_HEIGHT * scale,  /// NE
        HEX_DIMS.width * scale, (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * scale,  // SE
        HEX_DIMS.width / 2 * scale, HEX_DIMS.height * scale,  // S
        0, (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * scale,  // SW
        0, HEX_CORNER_HEIGHT * scale, // NW
    ]));
    path.fillColor = new paper.Color(
        getGradient(hex.resource),
        new paper.Point(0, HEX_CORNER_HEIGHT * scale),
        new paper.Point(HEX_DIMS.width * scale, (HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * scale));
    path.strokeColor = new paper.Color('black');
    path.strokeWidth = 1;

    group.addChild(path);

    if (this.showStats) {
      const score = this.renderText(round(hex.score, 1) + '',
          new paper.Point(HEX_DIMS.width /  2 * scale, 18 * scale));
      group.addChild(score);
    }

    group.position = new paper.Point(
      (HEX_DIMS.width / 2 * hex.x + BOARD_OFFSET.x + HEX_DIMS.width / 2) * scale,
      ((HEX_CORNER_HEIGHT + HEX_SIDE_HEIGHT) * hex.y + BOARD_OFFSET.y + HEX_DIMS.height / 2)
          * scale);

    // rollNumItem is not attatched to the group so that it can be animated separately.
    let rollNumItem = null;
    if (hex.rollNumber) {
      rollNumItem = this.renderRollNumber(hex.rollNumber);
      rollNumItem.position = group.position.clone();
    }

    if (this.showStats) {
      group.onClick = () => {
        const details = {x: hex.x, y: hex.y, score: hex.score};
        console.log('Hex', details);
      };
    }

    return [group, rollNumItem];
  }

  private renderRollNumber(rollNum: number): paper.Item {
    const scale = this.adjustScale(ROLL_NUM_SCALE_FACTOR);
    const group = new paper.Group();

    const color = rollNum === 6 || rollNum === 8 ? '#D50000' : 'black';
    const point = new paper.Point(0, 0);

    const circle = new paper.Shape.Circle(point, ROLL_NUMBER_SIZE * scale);
    circle.fillColor = new paper.Color('#FFECB3');
    circle.strokeColor = new paper.Color('black');
    circle.strokeWidth = 1;
    group.addChild(circle);

    const text = this.renderText(rollNum + '', new paper.Point(0, -2),
                                 { color, size: 20, bold: true, scale });
    group.addChild(text);

    const dotsGroup = new paper.Group();
    const numDots = getNumDots(rollNum);
    for (let i = 0; i < numDots; i++) {
      const dot = new paper.Shape.Circle(new paper.Point(i * 4 * scale, 0), 1 * scale);
      dot.fillColor = new paper.Color(color);
      dotsGroup.addChild(dot);
    }
    group.addChild(dotsGroup);
    dotsGroup.position.y = 16 * scale;
    dotsGroup.position.x -= (numDots / 2 * 4 - 2) * scale;

    return group;
  }

  /**
   * Renders the score at a corner. This is only used for debugging.
   */
  private renderCorner(corner: Corner, isBest: boolean, isWorst: boolean): paper.Group {
    const scale = this.sizeAndScale.scale;
    const group = new paper.Group();

    const point = this.getCornerPoint(corner);
    const circle = new paper.Path.Circle(point, 10 * scale);

    if (isBest) {
      circle.fillColor = new paper.Color('green');
    } else if (isWorst) {
      circle.fillColor = new paper.Color('red');
    } else {
      circle.fillColor = new paper.Color('black');
    }
    group.addChild(circle);

    const text = this.renderText(round(corner.score, 1) + '',
                                 point, {color: 'white', size: 8});
    group.addChild(text);

    group.onClick = () => {
      console.log(corner);
    };

    return group;
  }

  private renderBeach(beach: Beach) {
    const scale = this.adjustScale(BEACH_SCALE_FACTOR);
    // Start with the points along the board.
    const beachCorners = this.board.getBeachCorners(beach.from, beach.to);
    const beachPoints = beachCorners.map(c => this.getCornerPoint(c));
    const points = beachPoints.slice();

    const outerRight =
        getPointFromLine(points[points.length - 1], points[points.length - 2], -60,
          BEACH_DISTANCE * scale);
    const farPointRight =
        getPointFromLine(outerRight, points[points.length - 1], -90, BEACH_DISTANCE * 100 * scale);
    const rightPath = new paper.Path([outerRight, farPointRight]);

    const outerLeft = getPointFromLine(points[0], points[1], 60, BEACH_DISTANCE * scale);
    const farLeftPoint =
        getPointFromLine(outerLeft, points[0], 90, BEACH_DISTANCE * 100 * scale);
    const leftPath = new paper.Path([outerLeft, farLeftPoint]);

    // Math is hard.
    // To find where outerMiddle should be, we create 2 90 degree lines from the edge of the other
    // outer points and then find the intersection of those lines.
    const outerMiddle = rightPath.getIntersections(leftPath)[0].point;

    points.push(outerRight, outerMiddle, outerLeft);

    const path = new paper.Path(points);
    {
      // Beach gradient
      const outerPoint = outerRight;
      const lastBeachPoint = beachPoints[beachPoints.length - 1];
      const vector = lastBeachPoint.subtract(outerPoint);
      vector.length += (HEX_SIDE_HEIGHT * 0.4 * scale);
      const innerPoint = outerPoint.add(vector);
      path.fillColor = new paper.Color(createGradient(WATER_COLORS), outerPoint, innerPoint);
    }
    path.strokeColor = new paper.Color('black');
    path.strokeWidth = 1;
    path.closed = true;

    this.renderBeachNumber(beach.connections[0], beachPoints[0], outerLeft, true);
    this.renderBeachNumber(beach.connections[1], beachPoints[beachPoints.length - 1], outerRight,
        false);
  }

  private renderBeachNumber(value: number, beachPoint: paper.Point, outerPoint: paper.Point, first: boolean) {
    const scale = this.adjustScale(BEACH_SCALE_FACTOR);
    let point = average(beachPoint, outerPoint);
    point = getPointFromLine(point, outerPoint, first ? -90 : 90, BEACH_NUMBER_DISTANCE * scale);
    const textScale = this.adjustScale(BEACH_TEXT_SCALE_FACTOR);
    this.renderText(value + '', point, {bold: true, scale: textScale});
  }

  private renderPort(port: Port) {
    const scale = this.adjustScale(BEACH_SCALE_FACTOR);
    const portPoints = port.corners.map(c => this.getCornerPoint(c));

    const labelPoint = getPointFromLine(
        average(portPoints[0], portPoints[1]), portPoints[1], 90, PORT_DISTANCE * scale);
    const labelScale = this.adjustScale(BEACH_TEXT_SCALE_FACTOR);

    // Create lines from label to hex
    portPoints.forEach(portPoint => {
      const line = new paper.Path([portPoint, weightedAverage(portPoint, labelPoint, 0.45)]);
      line.strokeColor = new paper.Color('#4E342E');
      line.strokeWidth = 4 * scale;
      line.strokeCap = 'round'; // square butt
    });

    // Create circle background.
    const radius = PORT_BACKGROUND_RADIUS * labelScale;
    const circle = new paper.Shape.Circle(labelPoint, radius);
    circle.fillColor =
        new paper.Color(
          getGradient(port.resource),
          labelPoint.subtract(radius), labelPoint.add(radius));
    circle.shadowColor = new paper.Color(0, 0.8);
    circle.shadowOffset = new paper.Point(0.4 * labelScale, 0.4 * labelScale);
    circle.shadowBlur = 3 * labelScale;

    // Create label text.
    const color = port.resource === ResourceType.ANY ? 'white' : 'black';
    const text  = port.resource === ResourceType.ANY ? '?' : port.resource.substr(0, 2);
    const label = this.renderText(text,
      labelPoint.subtract(new paper.Point(0, 1).multiply(labelScale)), {color, scale: labelScale});
  }

  private getCornerPoint(corner: Coordinate): paper.Point {
    const scale = this.sizeAndScale.scale;
    const xFactor = (corner.x + corner.y + this.board.dimensions.width + 1) % 2 ?
        0 : HEX_CORNER_HEIGHT;
    return new paper.Point(
        (corner.x * HEX_DIMS.width / 2 + BOARD_OFFSET.x) * scale,
        (corner.y * (HEX_SIDE_HEIGHT + HEX_CORNER_HEIGHT) + xFactor + BOARD_OFFSET.y) * scale);
  }

  // Renders text centered over a point.
  private renderText(content: string, center: paper.Point, opts: TextOpts = {}): paper.PointText {
    let size = opts.size || 12;
    size *= opts.scale || this.sizeAndScale.scale;
    const textPoint = new paper.Point(center);
    textPoint.y += size / 2;
    const label = new paper.PointText(textPoint);
    label.content = content;
    label.fontSize = size + 'px';
    if (opts.bold) {
      label.fontWeight = 'bold';
    }
    label.fillColor = new paper.Color(opts.color || 'black');
    label.justification = 'center';
    return label;
  }

  private renderDragons() {
    const dragonCoordinates = this.board.spec.dragons;
    for (let i = 0; i < dragonCoordinates.length; i += 2) {
      this.renderDragon({x: dragonCoordinates[i], y: dragonCoordinates[i + 1]});
    }
  }

  private renderDragon(corner: Coordinate) {
    const scale = this.sizeAndScale.scale;
    const group = new paper.Group();

    const point = this.getCornerPoint(corner);
    const circle = new paper.Path.Circle(point, 13 * scale);
    circle.fillColor = new paper.Color('#689F38');
    circle.shadowColor = new paper.Color(0, 0.8);
    circle.shadowOffset = new paper.Point(0.2 * scale, 0.2 * scale);
    circle.shadowBlur = 1 * scale;
    group.addChild(circle);

    const textPoint = point.clone();
    textPoint.x += 1;
    textPoint.y += -2;
    const text = this.renderText('🐉', textPoint, {size: 14});
    group.addChild(text);
  }



  // ===================================================================
  //  Animation Logic
  // ===================================================================
  private configureAnimation() {
    this.animationComplete = false;
    this.hexAnimConfig = clone(HEX_ANIM_CONFIG);
    // If this is during page-load, then wait a little bit before starting the animation. Otherwise
    // most frames will be dropped.
    this.hexAnimConfig.startTime = firstRenderComplete ? 0.03 : 0.3;
    this.calculateTotalDuration(this.hexAnimConfig);

    this.rollNumAnimConfig = clone(ROLL_NUM_ANIM_CONFIG);
    // Start the rollNum animtions part of the way through the hex animations.
    this.rollNumAnimConfig.startTime =
        this.hexAnimConfig.startTime +
        this.hexAnimConfig.offsetDuration * this.hexItems.length * 0.6;
    this.calculateTotalDuration(this.rollNumAnimConfig);

    this.project.view.onFrame = this.handleFrame.bind(this);
    this.handleFrame({count: 0, time: 0, delta: 0});

    firstRenderComplete = true;
  }

  private handleFrame(event: {count: number, time: number, delta: number}) {
    if (this.animationComplete) {
      return;
    }

    for (let i = 0; i < this.hexItems.length; i++) {
      const finalY = this.finalHexYs[i];
      this.animateItem(event.time, this.hexItems[i], i, finalY, this.hexAnimConfig);
      this.animateItem(event.time, this.rollNumItems[i], i, finalY, this.rollNumAnimConfig);
    }

    if (event.time > this.rollNumAnimConfig.totalDuration) {
      this.animationComplete = true;
    }
  }

  private animateItem(frameTime: number, item: paper.Item|null, index: number, finalY: number,
                      config: AnimationConfig) {
    if (!item) {
      return;
    }
    const initialTime =  index * config.offsetDuration + (config.startTime || 0);
    const animPerc = Math.max(0, Math.min((frameTime - initialTime) / config.duration, 1));
    const animEased = easeOut(animPerc);
    item.opacity = config.animateOpacity ? animEased : (animPerc ? 1 : 0);
    item.position.y = finalY + ((1 - animEased) * config.distance);
  }

  private calculateTotalDuration(config: AnimationConfig) {
    assert(config.startTime !== undefined);
    config.totalDuration =
        config.startTime + config.duration + config.offsetDuration * this.hexItems.length;
  }

  private adjustScale(factor: number): number {
    return Math.pow(this.sizeAndScale.scale, factor);
  }
}
