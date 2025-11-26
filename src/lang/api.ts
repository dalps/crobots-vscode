export interface APICall {
  params: { name: string; descr?: string }[];
  returns: { descr?: string };
}

/** Imperative functions that access and manipulate the robot's state. */
export interface RobotAPI {
  scan(degree: number, resolution: number): number;
  cannon(degree: number, range: number): number;
  drive(degree: number, speed: number): void;
  damage(): number;
  speed(): number;
  loc_x(): number;
  loc_y(): number;
}

/** Auxiliary pure functions, independent of the robot's state. */
export interface MathAPI {
  rand(bound: number): number;
  sqrt(x: number): number;
  sin(x: number): number;
  cos(x: number): number;
  tan(x: number): number;
  atan(x: number): number;
  // debug(x: number): void;
}

const TRIG_SCALE = 100_000;

export interface ArgumentDescription {
  label: string;
  type: "int";
  name?: string;
  documentation?: string;
}

export interface ReturnDescription {
  type: "int";
  documentation?: string;
}

export interface RobotAPIDetails {
  label: string;
  detail?: string;
  documentation?: string;
  parameters?: ArgumentDescription[];
  return?: ReturnDescription;
}

export const API_SPEC: Record<string, RobotAPIDetails> = {
  cannon: {
    label: "cannon",
    detail: "Fire a missile",
    documentation: "Fires a missile heading a specified range and direction.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
      {
        label: "range",
        type: "int",
        documentation: "A value within the range 0-700.",
      },
    ],
    return: {
      type: "int",
      documentation:
        "1 (true) if a missile was fired, 0 (false) if the cannon is reloading.",
    },
  },
  scan: {
    label: "scan",
    detail: "Scan the arena for targets",
    documentation:
      "Invokes the robot's scanner at a specified degree and resolution.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
      {
        label: "resolution",
        type: "int",
        documentation: "A value within the range +/-10.",
      },
    ],
    return: {
      type: "int",
      documentation:
        "0 if no robots are within the scan range or a positive integer representing the the distance to the closest robot.",
    },
  },
  drive: {
    label: "drive",
    detail: "Move the robot",
    documentation:
      "Activates the robot's drive mechanism on a specified heading and speed.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
      {
        label: "speed",
        type: "int",
        documentation:
          "A percentage of the speed, with 100 as maximum. A speed of 0 disengages the drive.",
      },
    ],
  },
  damage: {
    label: "damage",
    detail: "Robot's damage",
    documentation: "Get the robots's current damage.",
    return: { type: "int", documentation: "A percent of the damage." },
  },
  speed: {
    label: "speed",
    detail: "Robot's speed",
    documentation: "Get the robots's current speed.",
    return: { type: "int", documentation: "A percent of the speed." },
  },
  // heading: {
  //   label: "heading",
  //   detail: "Robot's heading",
  //   documentation: "Get the robots's current heading.",
  //   return: { type: "int", documentation: "A value within the range 0-359." },
  // },
  loc_x: {
    label: "loc_x",
    detail: "Robot's x coordinate",
    documentation: "Get the robots's current x coordinate.",
    return: { type: "int", documentation: "A value within the range 0-999." },
  },
  loc_y: {
    label: "loc_y",
    detail: "Robot's y coordinate",
    documentation: "Get the robots's current y coordinate.",
    return: { type: "int", documentation: "A value within the range 0-999." },
  },
  rand: {
    label: "rand",
    detail: "Get a random integer",
    documentation: "Returns a number between 0 and `limit`.",
    parameters: [{ label: "limit", type: "int" }],
    return: { type: "int" },
  },
  sqrt: {
    label: "sqrt",
    detail: "square root",
    documentation:
      "Returns the integer square root of a number. The argument is made positive, if necessary.",
    parameters: [{ label: "x", type: "int" }],
    return: { type: "int" },
  },
  sin: {
    label: "sin",
    documentation: "Returns the sine of the argument times 100,000.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
    ],
    return: {
      type: "int",
      documentation: "The trigonometric value scaled by 100,000.",
    },
  },
  cos: {
    label: "cos",
    documentation: "Returns the cosine of the argument times 100,000.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
    ],
    return: {
      type: "int",
      documentation: "The trigonometric value scaled by 100,000.",
    },
  },
  tan: {
    label: "tan",
    documentation: "Returns the tangent of the argument times 100,000.",
    parameters: [
      {
        label: "degree",
        type: "int",
        documentation: "A value within the range 0-359.",
      },
    ],
    return: {
      type: "int",
      documentation: "The trigonometric value scaled by 100,000.",
    },
  },
  atan: {
    label: "atan",
    documentation: "Returns the arctangent of the argument.",
    parameters: [
      {
        label: "ratio",
        type: "int",
        documentation: "The y/x ratio scaled by 100,000. ",
      },
    ],
    return: {
      type: "int",
      documentation: "A degree value in the range [-90,+90]",
    },
  },
};

// Extend the API's labels with the names and types of the parameters and the return type
Object.entries(API_SPEC).forEach(([name, info]) => {
  if (info.parameters) {
    info.parameters.forEach((info) => {
      info.name ||= info.label;
      info.label = `${info.label}: ${info.type}`;
    });
  }

  const paramsStr = (info.parameters ?? []).map((i) => i.label).join(", ");
  const retStr = info.return ? `: ${info.return.type}` : `: void`;

  API_SPEC[name].label = `${name}(${paramsStr})${retStr}`;
});
