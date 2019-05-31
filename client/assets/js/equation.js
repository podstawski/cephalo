var Angle = function(p,fullData) {

  if (fullData)
    this.full = fullData;

  if (!Array.isArray(p) || p.length<=1 || p.length>3 || yFactor===0) {
    this.value=0;
    return;
  }
  if (p.length===2) {

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
      var tg=yFactor*Math.abs(p[0].y-p[1].y)/Math.abs(p[0].x-p[1].x);
      this.value=180*Math.atan(tg)/Math.PI;
    }
    if (quarter===3 || quarter===1)
      this.value=90-this.value;

    this.value+=90*quarter;


  }

  //console.log(p);

}

Angle.prototype.setFull = function (full) {
  this.full = full;
  return this;
}

Angle.prototype.toString = function() {
  var title='OK';
  var post='';

  if (this.full.maxValue && this.value>this.full.maxValue) {
    title = this.full.above;
    post=' <span style="color:red">↗</span>';
  }
  if (this.full.minValue && this.value<this.full.minValue) {
    title = this.full.below;
    post=' <span style="color:red">↘</span>';
  }

  return '<span title="'+title+'">'+(Math.round(this.value*10)/10)+'°</span>'+post;
}

Angle.prototype.getValue = function() {
  return this.value;
}

Angle.prototype.subtract = function(a,reflect) {
  this.value-= a.getValue();
  if (reflect) {
    this.value = reflect - Math.abs(this.value);
  }
  return this;
}

var Line = function (p1,p2) {
  this.points = [p1,p2];
}

var MM = function(len) {
  this.len=len;
}

Line.prototype.projection = function(P) {
  var p=P.getPoints()[0];
  var A = this.points[1].x - this.points[0].x,
    B = this.points[1].y - this.points[0].y,
    p3;
  var u = (A*(p.x-this.points[0].x)+B*(p.y-this.points[0].y))/(Math.pow(A,2)+Math.pow(B,2));

  if (u<=0) {
    p3 = p1;
  }
  else if (u>=1) {
    p3 = p2;
  }
  else {
    p3 = {
      x: parseFloat(this.points[0].x) + u * A,
      y: parseFloat(this.points[0].y) + u * B
    };
  }

  return new Equation([p3],null,P.getColor());
}

Line.prototype.lenFromPoint = function(P,cmLine) {
  return this.projection(P).line(P).len(cmLine);
  return P.line(this.projection(P)).len(cmLine);
}

Line.prototype.len = function(cmLine) {
  var len =  Math.sqrt(Math.pow(this.points[0].x-this.points[1].x,2)+Math.pow(this.points[0].y-this.points[1].y,2));

  if (cmLine && cmLine.getPoints && cmLine.getPoints().length===2) {
    var cmP=cmLine.getPoints();
    var cmLineLen = Math.sqrt(Math.pow(cmP[0].x-cmP[1].x,2)+Math.pow(cmP[0].y-cmP[1].y,2));
    len = 10 * (len/cmLineLen);
  }

  if (this.points[0].x > this.points[1].x)
    len*=-1;

  return new MM(len);
}


MM.prototype.toString = function () {
  return (Math.round(this.len*10)/10) + 'mm';
}

MM.prototype.valueOf = function () {
  return this.len;
}

MM.prototype.setFull = function (full) {
  this.full = full;
  return this;
}

var Equation = function(points,equation,color,full) {
    this.equation=equation;
    this.points=points;
    this.value=null;
    this.color=color;
    if (full) {
      //console.log(full);
      this.full = full;
    }

}


Equation.prototype.getEquation = function() {
  return this.equation;
};


Equation.prototype.getPoints = function() {
  return this.points;
};

Equation.prototype.setYFactor = function(yFactor) {
  if (yFactor)
    this.yFactor = yFactor;
  return this.yFactor;
}

Equation.prototype.angle = function(p,reflect) {

  var a=new Angle(this.points, this.full);
  if (typeof(p)==='undefined')
    return a;
  if (p==null || !p.getPoints || !p.getPoints())
    return null;

  return a.subtract(new Angle(p.getPoints(),this.full),reflect);
};

Equation.prototype.get = function() {
  return this.value;
};

Equation.prototype.set = function(v) {
  this.value=v;
  return this;
};

Equation.prototype.setFull = function (full) {
  this.full = full;
  return this;
}

Equation.prototype.getColor = function() {
  return this.color;
};

Equation.prototype.line = function(e) {
  if (!e && this.points.length!=2)
    return null;
  if (!e)
    return new Line(this.points[0],this.points[1]);
  return new Line(this.points[0],e.getPoints()[0]);
};


var Value = function(v,r,post) {
  this.value = v;
  this.round = r;
  this.post = post;
}

Value.prototype.valueOf = function () {
  return this.value;
}

Value.prototype.toString = function () {
  var v=this.value;
  if (this.round!==null) {
    if (this.round===0)
      v = Math.round(v);
    else
      v= Math.round(10*this.round*v)/(10*this.round);
  }
  return v+this.post;
}

