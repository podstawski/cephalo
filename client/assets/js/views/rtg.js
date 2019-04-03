/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */


var polygonMode=false;
var polygonPoints=[];
var elements={};
var lastDragEvent=0;
var thisrtg=0;
var dotW=16;
var dotH=16;
var uploadImage=null;
var originalSvgWidth;
var callingDevice;
var lastDraggedElement=null;
var editmode=true;
var deviceRatio=5;
var minDeviceRatio=3;
var maxDeviceRatio=10;
var busRequested=false;
var ctrlOn=false;
var maxPointCount=0;
var currentPolygonColor='';
var currentPolygonTypeId='';
var currentPolygonSymbol='';
var equation={};




var modalCleanup = function() {
    lastDraggedElement=null;
    $('#edit-element').removeClass('aside-edit');
    $('#edit-element').removeClass('device-edit');
    $('#edit-element').removeClass('control-edit');
    $('#edit-element').removeClass('polygon-edit');
};


var zoomContainer = function(z,set,e) {
    
    var sel='#rtg-container .draggable-container';
    var current=$(sel).css('zoom');
    var w=$(sel).width(),h=$(sel).height(),x=parseFloat($(sel).css('left')),y=parseFloat($(sel).css('top'));
    if (isNaN(x)) x=0;
    if (isNaN(y)) y=0;
    

    if (current===undefined) {
        current=$(sel).css('-moz-transform');
        if (current===undefined || current=='none') current=1;
        else {
            current=current.substr(7);
            current=current.split(',');
            current=parseFloat(current[0]);
        }
    } else if (current.indexOf('%')>0) {
        current=current.replace('%','');
        current=parseFloat(current)/100;
    } else {
        current=parseFloat(current);
    }
 
    
    if (z!=null) {
        current*=z;
        if (set!=null) current=set;
        $(sel).css('-moz-transform','scale('+current+')');
        $(sel).css('zoom',current);
        
        if (e!=null) {
            var ox=e.pageX-$('#rtg-container').offset().left;
            var oy=e.pageY-$('#rtg-container').offset().top;
    
            $(sel).css('left',(x+(1-z)*ox/current)+'px');
            $(sel).css('top',(y+(1-z)*oy/current)+'px');                
        }
    }    
    
    return current;    

}

var devicesStateEmiter = function(addr,state) {
    if (addr==null) return !editmode;
    busSend(addr,state);
}


var pointInPolygonCheck = function (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

var roomOfDevice = function(obj) {
  return;
    for (var i=0; i<elements.length; i++) {
        if (elements[i].type!='polygon') continue;
        var points=[];
        for (var j=0; j<elements[i].points.length; j++) {
            points.push([elements[i].points[j].x,elements[i].points[j].y]);
        }
        var p1=calculatePoint({x:parseInt(obj.css('left')),y:parseInt(obj.css('top'))});
        var p2=calculatePoint({x:parseInt(obj.css('left'))+parseInt(obj.css('width')),y:parseInt(obj.css('top'))});
        var p3=calculatePoint({x:parseInt(obj.css('left'))+parseInt(obj.css('width')),y:parseInt(obj.css('top'))+parseInt(obj.css('height'))});
        var p4=calculatePoint({x:parseInt(obj.css('left')),y:parseInt(obj.css('top'))+parseInt(obj.css('height'))});
        
        if (pointInPolygonCheck([p1.x,p1.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p2.x,p2.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p3.x,p3.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p4.x,p4.y],points)) return elements[i].id; 
        
    }
    return null;    
}


var calculatePoint = function(p,dbg) {
    var zoom=zoomContainer();
    var w=parseFloat($('#rtg-container .draggable-container').width());
    var h=parseFloat($('#rtg-container .draggable-container').height());
    
    
    
    if (p.x > 1) {
        var point={
            x: (p.x)/(w), //*zoom
            y: (p.y)/h
        };
    } else {
        var point={
            x: p.x*w, //*zoom
            y: p.y*h
        };
    }

    
    return point;
}



var moveElements = function() {

  $('#rtg-container .draggable-container .element').remove();
  for (var k in elements)
    drawPolygon(elements[k].points,elements[k].id,elements[k].data,elements[k].color,false,k,elements[k].equetion);
}

var drawPolygonPoints = function() {

    
    var xs=[];
    for (var i=0; i<polygonPoints.length; i++) {
    
        xs.push(polygonPoints[i].x);
        var p=calculatePoint(polygonPoints[i]);
        var x=p.x - (dotW/2);
        var y=p.y - (dotH/2);
        
        polygonPoints[i].dot.css({left: x, top: y});
        
    }
    

}



var calculateWH = function (autoheight) {
    
    var top=270;
    
    //top=-300;
    
    var height=parseInt($(window).height())-top;
    if (height<200) height=200;
    
    if (autoheight) {
        $('#rtg-container').css('height','auto');
    } else {
        $('#rtg-container').height(height);
    }
    
    //$('img.svg').width($('#rtg-container .draggable-container').width());
    $('img.svg').width($('#rtg-container').width());
    $('#rtg-container .draggable-container').width($('#rtg-container').width());


    drawPolygonPoints();
    moveElements();
}

var drawPolygon = function(points,id,data,color,isDrawing,symbol,doNotRecalculate) {
    //console.log('drawPolygon',points,id,data,color,isDrawing,symbol);
    var name;

    if (typeof data==='string')
      name=data;
    else if (data && data.equation)
      name=data.equation.name||'';
    else if (symbol)
      name=symbol;
    else
      name='';

    
    var points2=[],p='';
    for (var i=0; i<points.length; i++) points2.push(calculatePoint(points[i]));

    var minx=0,miny=0,maxx=0,maxy=0;
    var r=5;
    
    for (var i=0; i<points2.length; i++) {

        /*
        //align to lines:
        for (var j=0; j<i; j++) {
            if (Math.abs(points2[i].x-points2[j].x)<10) points2[i].x=points2[j].x;
            if (Math.abs(points2[i].y-points2[j].y)<10) points2[i].y=points2[j].y;
        }
        */
        //calculate bounds:

      if (points2[i].x<minx || minx===0) minx=points2[i].x;
      if (points2[i].y<miny || miny===0) miny=points2[i].y;
      if (points2[i].x>maxx ) maxx=points2[i].x;
      if (points2[i].y>maxy ) maxy=points2[i].y;
    }

    if (points2.length===1) { //circle
      minx=points2[0].x-r;
      miny=points2[0].y-r;
      maxx=points2[0].x+r;
      maxy=points2[0].y+r;
    }


    for (var i=0; i<points2.length; i++) {
        p+=Math.round(points2[i].x - minx) + ',' + Math.round(points2[i].y - miny) + ' ';
    }
    
    var polygon;

    var style=[];
    if (color) {
      if (points2.length===1)
        style.push('fill:' + color);
      else
        style.push('stroke:' + color);
    }

    if (style.length>0)
        style=' style="'+style.join(';')+'"';
    else
        style='';


    var cl = isDrawing ? ' drawing':'';
    if (symbol)
        cl+=' type-'+symbol;

    if (doNotRecalculate)
      cl+=' equation';

    if (points2.length>2) {
        polygon='<div class="polygon'+cl+' element"><div>'+name+'</div><svg><polygon'+style+' points="'+p.trim()+'"/></svg></div>';
    } else if (points2.length===2) {
        polygon='<div class="line'+cl+' element"><svg><line'+style+' x1="'+Math.round(points2[0].x - minx)+'" y1="'+Math.round(points2[0].y - miny)+'" x2="'+Math.round(points2[1].x - minx)+'" y2="'+Math.round(points2[1].y - miny)+'"/></svg></div>';
    } else {
      polygon='<div class="circle'+cl+' element"><svg><circle'+style+' cx="'+Math.round(points2[0].x - minx)+'" cy="'+Math.round(points2[0].y - miny)+'" r="'+r+'"/></svg></div>';
    }

    if (id)
      $('#rtg-container .draggable-container #'+id).remove();
    
    var poli = $(polygon).appendTo('#rtg-container .draggable-container').css({left: minx, top:miny});
    poli.width(maxx-minx>0?maxx-minx:1);
    poli.height(maxy-miny>0?maxy-miny:1);

    
    if (!id)
      id='id-'+Math.random();
    
 
    poli.attr('id',id);
    poli.attr('title',name);
    
    if (!symbol || isDrawing) return poli;

    elements[symbol]={
      element:poli,
      points: points,
      id:id,
      name:name,
      color:color,
      equetion: doNotRecalculate,
      data:data
    };

    if (!doNotRecalculate) {
      equation[symbol] = new Equation(points, null, color);
      recalculateEquation();
    }
    return poli;
}


var recalculateEquation = function (tick) {
  if (!tick)
    tick=0;
  //console.log(tick,equation);

  if (tick===0)
    $('#rtg-container .draggable-container .equation').remove();

  var html='';


  for (var k in equation) {
    var e=equation[k].getEquation();
    if (!e)
      continue;

    for (var kk in equation)
      e=e.replace('{'+kk+'}','equation.'+kk);

    if (e.indexOf('{')!==-1)
      continue;

    var str='var v='+e+';'
    try {
      eval(str);


      if (v instanceof Line) {
        console.log(k,'line');
        drawPolygon(v.points,k,null,equation[k].color,false,k,true);
        equation[k].points = v.points;

      } else {

        if (v) {
          equation[k].set(v);
          var color = equation[k].getColor() || '#fff';

          html += '<li style="color:' + color + '">' + k + ' = ' + v + '</li>';
        }
      }
    } catch (err) {
      console.log(str,err);
    }
  }

  $('#left-sidebar').html(html);
}


var zoomDraggableFix = function(obj) {


    obj.on('dragstart',function(e,ui) {
        var zdf={ex: e.pageX, ey: e.pageY, lf: ui.position.left, tp: ui.position.top};
        obj.attr('zdf',JSON.stringify(zdf));

    });
    
    obj.on('drag', function(e,ui) {
        var z=zoomContainer();
        if (z!=1) {
            var zdf=JSON.parse(obj.attr('zdf'));
        
            ui.position.left=zdf.lf + (e.pageX-zdf.ex)/z;
            ui.position.top=zdf.tp + (e.pageY-zdf.ey)/z;

        }
        
        zdf={ex: e.pageX, ey: e.pageY, lf: ui.position.left, tp: ui.position.top};
        obj.attr('zdf',JSON.stringify(zdf));
    });
    
    obj.on('dragstop', function() {
        obj.removeAttr('zdf');
    });
}


var removePolygonPoints=function() {
    for (var i=0; i<polygonPoints.length; i++) {
        polygonPoints[i].dot.remove();
        delete(polygonPoints[i].dot);
    }
    polygonPoints=[];

};

var createPolygonFromPoints = function() {

    $('#rtg-container .draggable-container .drawing').remove();
    var data = {
      equation: {name: currentPolygonSymbol, symbol:currentPolygonSymbol}
    };
    drawPolygon(polygonPoints,null,data,currentPolygonColor,false,currentPolygonSymbol);

    api('/line','POST',{rtgId: thisrtg, equationId: currentPolygonTypeId, points:polygonPoints},function(err,data){
        polygonMode=false;
        $('#rtg-container .rtg-polygon-dashboard').hide();

        if (err)
            return;
        removePolygonPoints();
    });

}



var rtgDraw=function(err,data) {

    if (err) {

        return;
    }
    var description = data.patient.firstName + ' ' +data.patient.lastName;

    
    $('.page-header .page-title').text(data.name);
    $('.page-header .page-desc').text(description);
    
    document.title=description+': '+data.name;

    setBreadcrumbs([{name: description, href:'patient.html,'+data.patient.id},
        {name: data.name, href:'rtg.html,'+data.id}]);

    $('.breadcrumb .breadcrumb-menu .btn-rtg').show();

    
    $('#rtg-container img.svg').attr('src',data.preview).load(function(){
        originalSvgWidth=$(this).width();
        calculateWH();
        //websocket.emit('db-select','rtg',[{rtg:thisrtg}]);
    });
    
    
    $('#rtg-container .rtg-polygon-dashboard').click(function(e){
        
        if (polygonMode && Date.now()-lastDragEvent>1500) {
            
            var ex = parseFloat(e.offsetX === undefined ? e.originalEvent.layerX : e.offsetX);
            var ey = parseFloat(e.offsetY === undefined ? e.originalEvent.layerY : e.offsetY);
            

            var zoom=zoomContainer();
            var w=parseFloat($('#rtg-container').width());
            var h=parseFloat($('#rtg-container .draggable-container').height());
            var point={
                x:(ex/zoom)/w,
                y:(ey/zoom)/h
            }

            
            var img='<img src="assets/img/dot.png" class="polygon-dot"/>';
            
            
            point.dot=$(img).css({left: -1*dotW, top: -1*dotH}).appendTo('#rtg-container .draggable-container');
            
            polygonPoints.push(point);
            point.dot.attr('title',polygonPoints.length);



            
            if (polygonPoints.length>1) {
                var l=polygonPoints.length-1;
                p=drawPolygon([polygonPoints[l],polygonPoints[l-1]],'line-'+l,null,currentPolygonColor,true);
            }

            if (polygonPoints.length===maxPointCount)
                createPolygonFromPoints();
            
            drawPolygonPoints();
        }
    
    });

    var filter=encodeURIComponent('{"include":"equation","where":{"rtgId":'+data.id+'}}');
    api('/line?filter='+filter,function(err,lines){
      if (err)
        return;
      for (var i=0; i<lines.length; i++) {
        drawPolygon(lines[i].points,'e-'+lines[i].id,lines[i],lines[i].equation.color,false,lines[i].equation.symbol);

      }
    });
    
}



var calculateLabelForSmekta = function(data,symbol) {
    var vattr=globalDevices[symbol].vattr||'';
    data.label_name='';
    if (vattr.length>0) {
        var attr=vattr.split(':');
        data.label_name=attr[0];
        if (attr.length>1) {
            data.select=[];
            var select=attr[1].split('|');
            for(var i=0;i<select.length;i++) {
                data.select.push({
                    value: select[i],
                    selected: select[i]==data.label
                });
            }
        }
    }
}


/*
 *draw devices in right sidebar
 */

var drawAsideDevices = function() {
    $('aside .device-element').each(function(){
        $(this).text('');
        var symbol=$(this).attr('rel');
        var pointCount=parseInt($(this).attr('points'));
        var color=$(this).attr('relcolor');
        var equationId=parseInt($(this).attr('equationId'))


        var html;
        var style='stroke-width:1; stroke:'+color;
        if (pointCount===1) {
          style="fill:"+color;
          html = '<div class="circle" style="height:30px"><svg><circle style="'+style+'" cx="15" cy="11" r="10"/></svg></div>';
        }
        if (pointCount===2)
            html='<div class="line" style="height:30px"><svg><line style="'+style+'" x1="1" y1="10" x2="30" y2="1"/></svg></div>';
        if (pointCount>2)
            html='<div class="polygon"></div><svg><polygon style="'+style+'; fill: none" points="30,1 1,8 30,16"/></svg></div>';

        $(this).html(html);
        $(this).click(function () {
            polygonMode=true;
            maxPointCount=pointCount;
            currentPolygonColor=color;
            currentPolygonTypeId=equationId;
            currentPolygonSymbol=symbol;
            $('#rtg-container .draggable-container .type-'+symbol).remove();
            $('#rtg-container .rtg-polygon-dashboard').show();
        })
    });
}

var buildAsideMenu = function(err,data) {

  if (err)
    return;

  var tags={};

  for (var i=0;i<data.length; i++) {
    if (data[i].equation && data[i].equation.length && data[i].equation.trim().length>0) {
      equation[data[i].symbol] = new Equation(null,data[i].equation,data[i].color);
      data.splice(i--,1);
      continue;
    }
    if (typeof(data[i].tags)==='string') {
      data[i].tags=data[i].tags.replace(',',' ');
      data[i].tags=data[i].tags.replace(/ +/,' ');
      var t=data[i].tags.split(' ');
      for (var j=0; j<t.length; j++) {
        if (t[j].length) tags[t[j]]=true;
      }
    }

    globalDevices[data[i].symbol]=data[i];
  }


  var tags2=[];

  for (var k in tags) tags2.push({tag:k});

  $.smekta_file('views/smekta/aside-devices.html',{tags:tags2,devices:data},'aside.aside-menu',function(){
    $('aside.aside-menu .translate').translate();
    $('aside.aside-menu ul.nav-tabs a.nav-link').click(function(){
      $('aside.aside-menu #devices .all').hide();
      $('aside.aside-menu #devices .'+$(this).attr('rel')).show();
    });

    drawAsideDevices();
  });

}


$(function(){

    var hash=window.location.hash;
    hash=hash.split(',');
    if (hash.length===1 || isNaN(parseInt(hash[1])))
        return;


    thisrtg=parseInt(hash[1]);
    api('/rtg/'+thisrtg,rtgDraw);

    //var filter=encodeURIComponent('{"where":{"equation":null}}')
    api('/equation',buildAsideMenu);

    
    busRequested=false;
    

    
    
    if (typeof($.breadcrumbIconClick)==='undefined') {
        $.breadcrumbIconClick=true;

        
        $(document).on('click','.breadcrumb .device-plus',function(){
            zoomContainer(1.1);
            
        });

        $(document).on('click','.breadcrumb .device-minus',function(){
            zoomContainer(0.9);
        });


        
    }

    $('#rtg-container .draggable-container').draggable({
        stop: function() {
            lastDragEvent=Date.now();
            $(this).css('height','auto');
        }
    });
    
    zoomDraggableFix($('#rtg-container .draggable-container'));
    

    
    /*
     *mousewheel: zoom in/out view
     */
    $('#rtg-container .draggable-container').bind('mousewheel', function(e){
        
        if(e.originalEvent.wheelDelta /120 > 0) zoomContainer(1.1,null,e);
        else zoomContainer(0.9,null,e);
        
    }).bind('DOMMouseScroll',function(e) {
        if (e.detail<0) zoomContainer(1.1,null,e);
        if (e.detail>0) zoomContainer(0.9,null,e);
        
    });   
    
    

    if ($.calculateWHbound===undefined) {
        $.calculateWHbound=true;
        $(window).bind('resize', function() {
            if (window.location.hash.indexOf('rtg')>=0) {
                calculateWH(); 
            }
            
        });
    
    }

    

    
    $('#img-input').on('change',function(){
		var d=$('#img-input').prop('files')[0];
		if (typeof(d)!='undefined') {
			var file_reader = new FileReader();
			file_reader.readAsDataURL(d);
			
			file_reader.onload = function() {
				uploadImage=file_reader.result;
				$('#edit-element .img-input img').attr('src',uploadImage);
			};
		}
	
	
	});
    

    

});
