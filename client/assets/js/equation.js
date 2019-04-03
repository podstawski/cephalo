var Angle = function(p) {

  if (!Array.isArray(p) || p.length<=1 || p.length>3) {
    this.value=0;
    return;
  }
  if (p.length==2) {

    var p1,p2,quarter;

    if (p[0].x<=p[1].x && p[0].y>=p[1].y)
      quarter=0;

    if (p[0].x>=p[1].x && p[0].y>=p[1].y)
      quarter=1;

    if (p[0].x>=p[1].x && p[0].y<=p[1].y)
      quarter=2;

    if (p[0].x<=p[1].x && p[0].y<=p[1].y)
      quarter=3;


    if (p[0].x === p[1].x) {
      this.value=90;
    } else {
      var tg=Math.abs(p[0].y-p[1].y)/Math.abs(p[0].x-p[1].x);
      this.value=180*Math.atan(tg)/Math.PI;
    }
    if (quarter===3 || quarter===1)
      this.value=90-this.value;

    this.value+=90*quarter;

    //console.log(p,quarter,this.value)

  }

  //console.log(p);

}

Angle.prototype.toString = function() {
  return (Math.round(this.value*10)/10)+'°';
}

Angle.prototype.getValue = function() {
  return this.value;
}

Angle.prototype.subtract = function(a) {
  this.value-= a.getValue();
  return this;
}

var Line = function (p1,p2) {
  this.points = [p1,p2];
}


var Equation = function(points,equation,color) {
    this.equation=equation;
    this.points=points;
    this.value=null;
    this.color=color;
}


Equation.prototype.getEquation = function() {
  return this.equation;
};


Equation.prototype.getPoints = function() {
  return this.points;
};

Equation.prototype.angle = function(p) {

  //console.log(p);
  var a=new Angle(this.points);
  if (typeof(p)==='undefined')
    return a;
  if (p==null || !p.getPoints || !p.getPoints())
    return null;

  return a.subtract(new Angle(p.getPoints()));
};

Equation.prototype.get = function() {
  return this.value;
};

Equation.prototype.set = function(v) {
  this.value=v;
  return this;
};

Equation.prototype.getColor = function() {
  return this.color;
};

Equation.prototype.line = function(e) {
  return new Line(this.points[0],e.getPoints()[0]);
};
