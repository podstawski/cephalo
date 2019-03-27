/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */


var polygonMode=false;
var polygonPoints=[];
var elements=[];
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

var lastRtgDebugTxt='';

var rtgDebug=function(txt) {
    if (lastRtgDebugTxt!=txt) {
        var dst=$('#rtg-container .draggable-container .rtg-debug-container .rtg-debug-contents');
        if (dst.length==1) {
            dst.append('<p>'+txt+'</p>');
            dst.scrollTop(dst[0].scrollHeight);
        }

    }
    lastRtgDebugTxt=txt;
}

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
    
    if (dbg) rtgDebug(p.x+','+p.y+' &raquo; '+point.x+','+point.y+' ('+w+','+h+')');
    //console.log(p.x,p.y,'->',point.x,point.y,'w:'+w,'h:'+h,zoom);
    
    return point;
}



var moveElements = function() {
   
    for (var i=0;i<elements.length;i++) {
        switch (elements[i].type) {
            case 'polygon': {
                elements[i].element.remove();
                drawPolygon(elements[i].points,elements[i].id,elements[i].data,elements[i]);
                break;
            }
            default: {
                drawDeviceElement(elements[i].data,elements[i]);
                break;
            }
            
        }
       
    }
    

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

var debugContainer = function() {
    rtgDebug('F/C:'+$('#rtg-container').width()+'/'+$('#rtg-container .draggable-container').width()+', z:'+Math.round(10*zoomContainer())/10);
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

    debugContainer();
    
    drawPolygonPoints();
    moveElements();
}

var drawPolygon = function(points,id,data,element,labelpoint,color,isDrawing,symbol) {
    console.log('drawPolygon',points,id,data,element,labelpoint,color,isDrawing,symbol);
    var name;
    if (data!=null) name=data.name||'';
    else name='';
  
    if (labelpoint==null && element!=null && typeof(element.data.lx)!=='undefined') {
        labelpoint={x:element.data.lx,y:element.data.ly};
    }
    var labelstyle='';
    if (labelpoint!=null) {
        var lp=calculatePoint(labelpoint);
        labelstyle='style="left: '+lp.x+'px; top: '+lp.y+'px;"';
    }
    
    
    
    var points2=[],p='';
    for (var i=0; i<points.length; i++) points2.push(calculatePoint(points[i]));

    var minx=0,miny=0,maxx=0,maxy=0;

    
    for (var i=0; i<points2.length; i++) {
        
        //align to lines:
        for (var j=0; j<i; j++) {
            if (Math.abs(points2[i].x-points2[j].x)<10) points2[i].x=points2[j].x;
            if (Math.abs(points2[i].y-points2[j].y)<10) points2[i].y=points2[j].y;
        }
        //calculate bounds:
        if (points2[i].x<minx || minx===0) minx=points2[i].x;
        if (points2[i].y<miny || miny===0) miny=points2[i].y;
        if (points2[i].x>maxx ) maxx=points2[i].x;
        if (points2[i].y>maxy ) maxy=points2[i].y;
              
    }
    
    for (var i=0; i<points2.length; i++) {
        p+=Math.round(points2[i].x - minx) + ',' + Math.round(points2[i].y - miny) + ' ';
    }
    
    var polygon;

    var style=[];
    if (color)
        style.push('stroke:'+color);

    if (style.length>0)
        style=' style="'+style.join(';')+'"';
    else
        style='';


    var cl = isDrawing ? ' drawing':'';
    if (symbol)
        cl+=' type-'+symbol;
    if (points2.length>2) {
        polygon='<div class="polygon'+cl+' element"><div '+labelstyle+'>'+name+'</div><svg><polygon'+style+' points="'+p.trim()+'"/></svg></div>';
    } else if (points2.length===2) {
        polygon='<div class="line'+cl+' element"><svg><line'+style+' x1="'+Math.round(points2[0].x - minx)+'" y1="'+Math.round(points2[0].y - miny)+'" x2="'+Math.round(points2[1].x - minx)+'" y2="'+Math.round(points2[1].y - miny)+'"/></svg></div>';
    } else {
        return;
    }
    
    
    var poli = $(polygon).appendTo('#rtg-container .draggable-container').css({left: minx, top:miny});
    poli.width(maxx-minx>0?maxx-minx:1);
    poli.height(maxy-miny>0?maxy-miny:1);

    
    if (id==null) id='id-'+Math.random();
    
 
    poli.attr('id',id);
    poli.attr('title',name);
    
    if (points2.length===2) return poli;
    
    if(element==null) {
        element={
            type:'polygon',
            element:poli,
            points: points,
            id:id,
            name:name,
            data:data
        };
        elements.push(element);
    } else {
        element.element=poli;
    }
    
    if (labelpoint!=null) {
        element.lx=labelpoint.x;
        element.ly=labelpoint.y;
    }
    



 
    return poli;
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


var drawDeviceElement = function(data,element) {
    
    if (!element) { 
        if (data.point.x<0 || data.point.y<0) {
            if (data.id) websocket.emit('db-remove','rtg',data.id);
            return;
        }
        data.wh=globalDevices[data.type].wh||1;
        
        var device=new Device(data, zoomContainer, devicesStateEmiter);
        device.parent($('#rtg-container .draggable-container'));
        element={device: device, type: 'device', data: data, id: data.id,ready4click:true};
        elements.push(element);

    } else {
        var device=element.device;
    }
    
    var z=data.z||1;
    data.z=z;
    var ratio=0.1*z*deviceRatio*$('#rtg-container').width()/originalSvgWidth;
    
    device.draw({
        stop: function(e,ui) {
            var d={id:data.id};
            var p=$(this).position();
            
            p.x=p.left;
            p.y=p.top;
            d.point=calculatePoint(p,true);
            d.room=roomOfDevice($(this));
            
            
            websocket.emit('db-save','rtg',d);
            lastDraggedElement={id: data.id,element: $(this)};
        },
        dblclickDevice: function(e) {
            if (!editmode) return;
            modalCleanup();
            $('#edit-element').addClass('device-edit');
            $('#edit-element .modal-header input').val(data.name);
            $('#edit-element').attr('rel',data.id);
            $('#edit-element .modal-body').html('');
            $('#edit-element').modal('show');
            
            uploadImage=null;
            
            calculateLabelForSmekta(data,data.type);
            
            data.admin=currentuser.admin;
            $.smekta_file('views/smekta/rtg-device.html',data,'#edit-element .modal-body',function(){
                $('#edit-element .modal-body .translate').translate();
            });
        },
        dblclickControl: function (e) {
            if (!editmode) return;
            modalCleanup();
            $('#edit-element').addClass('control-edit');
            $('#edit-element .modal-header input').val(data.name);
            $('#edit-element').attr('rel',data.id);
            $('#edit-element .modal-body').html('');
            $('#edit-element').modal('show');
            
            var cdata={};
            for (var i=0; i<this.attributes.length; i++) {
				var attr=this.attributes[i].nodeName;
				var val=this.attributes[i].nodeValue;
                cdata[attr]=val;
            }
            
            var children=$(this).parent().children();
            for (var i=0; i<children.length; i++) {
                if (children[i]==this) {
                    $('#edit-element').attr('rel2',i);
                }
            }
            
            cdata.admin=currentuser.admin;
            $.smekta_file('views/smekta/rtg-control.html',cdata,'#edit-element .modal-body',function(){
                $('#edit-element .modal-body .translate').translate();
            });
        }
    },ratio);
    
    element.element = device.dom();
    device.dom().addClass('element');
    zoomDraggableFix(device.dom());

    var zoomDevice=function(zoom) {
        if (!editmode || !ctrlOn) return;
        var z=data.z;
        z*=zoom;
        var d={id: data.id, z: z};
        data.z=z;
        device.dom().height(device.dom().height()*z/data.z);
        device.dom().width(device.dom().width()*z/data.z);
        websocket.emit('db-save','rtg',d);
        rtgDebug(data.haddr+' z: '+Math.round(z*10)/10);
    }
    
    if (element.ready4click) {
        element.ready4click=false;
        device.dom().click(function(e) {
            zoomDevice(1.1);
        }).contextmenu(function(e){
            zoomDevice(1/1.1);
            e.preventDefault();
        });
        
    }

    
    if (!editmode) {
        device.dom().draggable('disable');
    }
    
    var point=calculatePoint(data.point);
    
    device.dom().css({
        top:point.y,
        left:point.x
    });
    
    return device.dom();
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
    drawPolygon(polygonPoints,null,null,null,null,currentPolygonColor,false,currentPolygonSymbol);

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
                p=drawPolygon([polygonPoints[l],polygonPoints[l-1]],'line-'+l,null,null,null,currentPolygonColor,true);
            }

            if (polygonPoints.length===maxPointCount)
                createPolygonFromPoints();
            
            drawPolygonPoints();
        }
    
    });
    
    
}


var rtgDrawElements=function(data) {
    
    var haddrs=[];
    
    if (data.length>0 && data[0].rtg!=thisrtg) return;
    
    for(var i=0;i<elements.length;i++) {
        elements[i].toBeDeleted=true;
    }
    
    var newlements=0;
    var deletedelements=elements.length;
    
    for(var i=0;i<data.length;i++) {
        var matchFound=false;
        
        if (data[i].controls!==undefined && data[i].controls!=null) {
            for (var j=0; j<data[i].controls.length; j++) {
                if (data[i].controls[j].haddr !== undefined) {
                    haddrs.push(data[i].controls[j].haddr);
                }
            }
        }
        for(var j=0; j<elements.length; j++) {
            if (data[i].id == elements[j].id) {
                elements[j].toBeDeleted=false;
                for( var k in data[i]) elements[j].data[k]=data[i][k]; 
                matchFound=true;
                deletedelements--;
                break;
            }
        }
   
        if (!matchFound) {
            if (typeof(data[i].name)=='undefined') data[i].name='';
            newlements++;
            
            switch (data[i].type) {
                case 'polygon': {
                    var p=null;
                    if (typeof(data[i].lx)!='undefined') {
                        p={x:data[i].lx,y:data[i].ly};
                    }
                    drawPolygon(data[i].points,data[i].id,data[i],null,p);
                    break;
                }
                default: {
                    var dom=drawDeviceElement(data[i]);
                    
                    if (typeof(data[i].room)=='undefined'|| data[i].room==null) {
                        setTimeout(function(dom,data){
                            var room=roomOfDevice(dom);
                            if (room!=null) {
                                data.room=room;
                                websocket.emit('db-save','rtg',data);           
                            }
                        },1000,dom,data[i]);
                        
                    }
                    
                    break;
                }
            }        
            
        }
        
        
    }

    rtgDebug('Elements: '+data.length+' (new:'+newlements+'), removed: '+deletedelements);
    debugContainer();
    for(var i=0;i<elements.length;i++) {
        
        if (typeof(elements[i].toBeDeleted)!='undefined' && elements[i].toBeDeleted) {
            elements[i].element.remove();
            elements.splice(i,1);
            i--;
        }
    }    
    
    moveElements();

    
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
        if (pointCount===1)
            html='<img src="assets/img/dot.png" class="polygon-dot"/>';
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




$(function(){

    var hash=window.location.hash;
    hash=hash.split(',');
    if (hash.length===1 || isNaN(parseInt(hash[1])))
        return;


    thisrtg=parseInt(hash[1]);
    api('/rtg/'+thisrtg,rtgDraw);

    var filter=encodeURIComponent('{"where":{"equation":null}}')
    api('/equation?filter='+filter,buildAsideMenu);

    
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
    
    $('#rtg-container .draggable-container .rtg-debug-container').draggable();
    zoomDraggableFix($('#rtg-container .draggable-container .rtg-debug-container'));
    
    $('#rtg-container .draggable-container .rtg-debug-container a').click(function(){
        $(this).parent().remove();
    });
    
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

    
    
    /*
     *save element
     */
    $('#edit-element .btn-info').click(function(){
        
		$('#edit-element').modal('hide');
		var data={id:$('#edit-element').attr('rel')};
		
        if (!$('#edit-element').hasClass('control-edit')) {
            $('#edit-element input,#edit-element select').each(function(){
                data[$(this).attr('name')]=$(this).val();
            });
        }
        
        if ($('#edit-element').hasClass('polygon-edit')) {
            if (uploadImage!=null) {
                data.img=uploadImage;
            }
            
            websocket.emit('db-save','rtg',data);
        }
        
        if ($('#edit-element').hasClass('aside-edit')) {
            for (var k in data) {
                if (data[k]!==undefined) {
                    callingDevice.attr(k,data[k]);
                }
            }
            callingDevice.draw();
        }
            
            
        if ($('#edit-element').hasClass('device-edit')) {
                
            if (uploadImage!=null) {
                data.img=uploadImage;
            }
            
            
            for (var i=0; i<elements.length; i++) {
                if (elements[i].id==data.id && elements[i].device!==undefined) {
                    for(var k in data) {
                        elements[i].device.attr(k,data[k]);
                    }
                    elements[i].device.draw();
                }
            }
            
            websocket.emit('db-save','rtg',data);            
        } 
        

        if ($('#edit-element').hasClass('control-edit')) {

            
            for (var i=0; i<elements.length; i++) {
                if (elements[i].id==data.id && elements[i].device!==undefined) {
                    data.controls = elements[i].data.controls;
                    break;
                }
            }

            var rel2=$('#edit-element').attr('rel2');
            
            $('#edit-element input,#edit-element select').each(function(){
                data.controls[rel2][$(this).attr('name')]=$(this).val();
            });
            
            
            websocket.emit('db-save','rtg',data);
        }
        

        
    });
    
    $('#confirm-delete .btn-danger').click(function () {
        $('#confirm-delete').modal('hide');
        $('#edit-element').modal('hide');
        websocket.emit('db-remove','rtg',$('#edit-element').attr('rel'));
    });
    
    
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
