/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var mathsColumns=[
	{
		title: $.translate("Symbol"),
		data: "symbol",
	},
  {
    title: $.translate("Name"),
    data: "name",

  },
  { title: $.translate("Points"), data: "pointCount" },
	{ title: $.translate("Tags"), data: "tags" },
  {
		title: $.translate("Color"),
		data: "color",
    className: "dark",
		sortable: false,
		render: function ( data, type, full, meta ) {
			return '<span style="color:'+data+'">'+data+'</span>';
		}
	},
    {
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-math"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var mathsData={};
var mathsDataArray=[];


/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: mathsTableDraw
 * called from websocket on data ready
 */
var mathsTableDraw = function(data) {

	mathsData={};

	var datatable = $('.mathtable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
	
		for (var j=0; j<mathsColumns.length; j++) {
			if (mathsColumns[j].data==null) continue;
			
			if (typeof(data[i][mathsColumns[j].data])=='undefined') {
                data[i][mathsColumns[j].data]='';
            }
		}
		
		mathsData[data[i].DT_RowId] = data[i];

	}
	
	mathsDataArray=data;
	
	
	datatable.clear();
  datatable.rows.add(data);
  datatable.draw();
}


var ListenForMaths=function() {

	api('equation',function (err,maths) {
    if (!err)
      mathsTableDraw(maths);
  });

}




$(function(){
	
	document.title = $.translate('Equations');
	
	/*
	 *DataTable init
	 */
	$('.mathtable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: mathsColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Equations'), href:'maths.html'}]);
		
	/*
	 *request to get all maths
	 */
	
	ListenForMaths();
	
	var clearReferenceClasses = function(newclass) {
		$('#edit-math').removeClass('add-math').removeClass('edit-math').addClass(newclass);
		
	};
	
	if (typeof($.mathsInitiated)==='undefined') { //prevent multi event
	
		/*
		 *add plus clicked
		 */
	
		$(document).on('click','.maths .add-item',function(e) {
			clearReferenceClasses('add-math');
			$('#edit-math').modal('show');
			$('#edit-math .modal-header h4').text($.translate('New math'));
			
			$.smekta_file('views/smekta/edit-math.html',null,'#edit-math .modal-body',function(){
				$('#edit-math .modal-body .translate').translate();

        $('#edit-math .modal-body .mathColor').spectrum({
          color: '#f00',
          preferredFormat: "hex",
          move: function(color) {
            $('#edit-math .modal-body .mathColor').val(color.toString());
          }
        });

				setTimeout(function(){$('#edit-math .modal-body input').val('');},500);
				
			});
					
					
		});
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.mathtable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(mathsData[id].symbol);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.mathtable td a.btn-info',function(e){
			
			clearReferenceClasses('edit-math');
			$('#edit-math').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-math').attr('rel',id);
			$('#edit-math .modal-header h4').text(mathsData[id].mathname);

			
			$.smekta_file('views/smekta/edit-math.html',mathsData[id],'#edit-math .modal-body',function(){
				$('#edit-math .modal-body .translate').translate();

        $('#edit-math .modal-body .mathColor').spectrum({
          color: mathsData[id].color,
          preferredFormat: "hex",
          move: function(color) {
            $('#edit-math .modal-body .mathColor').val(color.toString());
          }
        });
				
				$('#edit-math .modal-body select').select2();
			});	
			
		});
		
		$(document).on('click','.mathtable .switch input',function(e){
			
			var mathId=$(this).parent().parent().parent().attr('id');
			var field=$(this).attr('rel');
			var data={};
			data[field]=$(this).prop('checked')?1:0;
			api('math/'+mathId,'PUT',data);
			mathsData[mathId][field]=data[field];
		});
		
		$.mathsInitiated=true;
	}
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');

    api('equation/'+$('#confirm-delete').attr('rel'),'DELETE',ListenForMaths);

	});

	/*
	 *save button in math edit
	 */
	$('#edit-math .btn-info').click(function(e){

		var mathId=$('#edit-math').attr('rel');

    var data={};
		$('#edit-math input,#edit-math select').each(function(){
			if(typeof($(this).attr('name'))!='undefined' && $(this).val().length>0)
				data[$(this).attr('name')]=$(this).val();
		});
		
		if ($('#edit-math').hasClass('add-math')) {


      $('#edit-math').modal('hide');
      api('equation','POST',data,function(err){
        ListenForMaths(true);
      });
		}
		
		
		if ($('#edit-math').hasClass('edit-math')) {
			  $('#edit-math').modal('hide');


				api('equation/'+mathId,'PUT',data,function(err){
          ListenForMaths(true);
        });
			



		}
		
		
	});

	


});

