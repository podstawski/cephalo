var Angle = function(p) {

  if (!Array.isArray(p) || p.length<=1 || p.length>3) {
    this.value=0;
    return;
  }
  if (p.length==2) {
    var p1,p2;
    if (p[0].x>p[1].x) {
      p2 = p[0];
      p1 = p[1];
    } else {
      p1 = p[0];
      p2 = p[1];
    }
    if (p1.x == p2.x) {
      this.value=90;
    } else {
      var tg=(p1.y-p2.y)/(p2.x-p1.x);
      this.value=180*Math.atan(tg)/Math.PI;
      if (this.value<0)
        this.value=180-this.value;
    }

  }

  //console.log(p);

}

Angle.prototype.toString = function() {
  return Math.abs(Math.round(this.value))+'°';
}

Angle.prototype.getValue = function() {
  return this.value;
}

Angle.prototype.subtract = function(a) {
  this.value-= a.getValue();
  return this;
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
  if (!p.getPoints)
    return null;

  var a=new Angle(this.points);
  if (!p || !p.getPoints)
    return a;

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