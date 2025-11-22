import { expect, test } from "vitest";
import { parseExpression, parseProgram, parseStatement } from "./cst_parser";

test("parse an expression", () => {
  const input = "2 * x + 2 % y";
  expect(parseExpression(input)).to.not.throw;
});

test("parse an expression #2", () => {
  const input = "2 + x % 42";
  expect(parseExpression(input)).to.not.throw;
});

test("parse an expression with parentheses", () => {
  const input = "(2 + x) % 42 - 2";
  expect(parseExpression(input)).to.not.throw;
});

test("parse an assignment expression", () => {
  const input = "x = (2 + x) % 42 + -(x += 3)";
  expect(parseExpression(input)).to.not.throw;
});

test("parse a boolean expression", () => {
  const input = "a_implies_b = !a || b";
  expect(parseExpression(input)).to.not.throw;
});

test("parse an if ...", () => {
  const input = "if (1) 1;";
  expect(parseStatement(input)).to.not.throw;
});

test("parse an if ... else ...", () => {
  const input = `
if (x % 2 == 0) {
  return 1;
} else {
  return 2;
}`;
  expect(parseStatement(input)).to.not.throw;
});

test("parse a while loop", () => {
  const input = `
while (x >= 0) {
  --x;
}`;
  expect(parseStatement(input)).to.not.throw;
});

test("parse a do ... while loop", () => {
  const input = "do --x; while (x >= 0);";
  expect(parseStatement(input)).to.not.throw;
});

test("parse a declaration statement", () => {
  const input = "int x, y = x * 2, z;";
  expect(parseStatement(input)).to.not.throw;
});

test("parse a program", () => {
  const input = `
int x, y = 3, z;

main() {
  return 0;
}
`;
  expect(parseProgram(input)).to.not.throw;
});

test("parse foo", () => {
  const input = `
int i;

main()
{
  i = 3;
  foo(270);
  return i;
}

foo(deg) {
  int i = 0;
  while (i < deg)
    i = i + 1;
}
`;
  expect(parseProgram(input)).to.not.throw;
});

test("parse old-style (or K&R) declarations", () => {
  const input = `
int i;

main()
{
  i = 3;
  foo(270);
  return i;
}

foo(deg)
int deg;
{
  int i = 0;
  while (i < deg)
    i = i + 1;
}

plot_course(xx,yy)
int xx, yy;
{
  int d;
  int x,y;
  int scale;
  int curx, cury;

  scale = 100000;  /* scale for trig functions */

  curx = loc_x();
  cury = loc_y();
  x = curx - xx;
  y = cury - yy;

  if (x == 0) {
    if (yy > cury)
      d = 90;
    else
      d = 270;
  } else {
    if (yy < cury) {
      if (xx > curx)
        d = 360 + atan((scale * y) / x);
      else
        d = 180 + atan((scale * y) / x);
    } else {
      if (xx > curx)
        d = atan((scale * y) / x);
      else
        d = 180 + atan((scale * y) / x);
    }
  }
  return (d);
}

distance(x1,y1,x2,y2)
int x1;
int y1;
int x2;
int y2;
{
  int x, y;

  x = x1 - x2;
  y = y1 - y2;
  d = sqrt((x*x) + (y*y));
  return(d);
}`;
  expect(parseProgram(input)).to.not.throw;
});

test("parse a complex program", () => {
  const input = `
int	Dir, Range, DirR;

main()
{
	DirR = xy2dir (100, 100);

	while (1) {
		drive (DirR, 100);
		while (loc_x() > 90 && speed()) {
			if (Range = scan (Dir, 3))
				cannon (Dir, 7 * Range / 8);
			else
			 {
				Dir -= 23;
				while (!(Range = scan (Dir, 10))) 
					Dir += 20;
				if (Range < 60) 
					Range = 60;
				cannon (Dir, 7 * Range / 8);
			};
		};
		DirR = xy2dir (899, 899);
		while (speed() > 50) 
			drive (DirR, 50);

		drive (DirR, 100);
		while (loc_x() < 910 && speed()) {
			if (Range = scan (Dir, 3))
				cannon (Dir, 7 * Range / 8);
			else
			 {
				Dir -= 23;
				while (!(Range = scan (Dir, 10))) 
					Dir += 20;
				if (Range < 60) 
					Range = 60;
				cannon (Dir, 7 * Range / 8);
			};
		};
		DirR = xy2dir (100, 100);
		while (speed() > 50) 
			drive (DirR, 50);
	};
}


xy2dir (x, y)
{
	int	d, locx, locy;

	locx = loc_x();
	locy = loc_y();

	if (locx == x) {
		if (y > locy)
			d = 90;
		else
			d = 270;
	} else
	 {
		if (y < locy) {
			if (x > locx)
				d = 360 + atan ((100000 * (locy - y)) / (locx - x) );
			else
				d = 180 + atan ((100000 * (locy - y)) / (locx - x) );
		} else if (x > locx)
			d = atan ((100000 * (locy - y)) / (locx - x) );
		else
			d = 180 + atan ((100000 * (locy - y)) / (locx - x) );
	};
	return (d);
}
`;
  expect(parseProgram(input)).to.not.throw;
});

test("parse a complex program with comments", () => {
  const input = `
int angle;
int range; /* variabili esterne */

main() /* Un piccolo robot che segue il bersaglio cannoneggiandolo */
{
  angle = 0;

  while (1)
  {
    drive(angle, 49);           /* velocita' massima per cambiare direzione */
    shoot();                    /* funzione esterna	*/
    angle = (angle + 85) % 360; /* scanning nei quattro quadranti */
  }
} /* end of main */

shoot() /* funzione esterna */
{
  while (range = scan(angle, 10)) /* esegui una scansione finche' il */
  {                               /* bersaglio non e' individuato... */
    cannon(angle, range);         /* e poi spara */
  }
}`;
  expect(parseProgram(input)).to.not.throw;
});
