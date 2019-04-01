/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var patientsColumns=[
  {
    title: $.translate("Lastname"),
    data: "lastName",
    className: "patientClick"
  },
	{
		title: $.translate("Firstname"),
		data: "firstName",
    className: "patientClick"
	},

	{
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var patientsData={};
var patientsDataArray=[];


/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: patientsTableDraw
 * called from websocket on data ready
 */
var patientsTableDraw = function(data) {

	patientsData={};

	var datatable = $('.patienttable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
	
		for (var j=0; j<patientsColumns.length; j++) {
			if (patientsColumns[j].data==null) continue;
			
			if (typeof(data[i][patientsColumns[j].data])=='undefined') {
                data[i][patientsColumns[j].data]='';
            }
		}
		
		patientsData[data[i].DT_RowId] = data[i];

	}
	
	patientsDataArray=data;
	
	
	datatable.clear();
  datatable.rows.add(data);
  datatable.draw();
}


var listenForPatients=function() {

	api('patient',function (err,patients) {
    if (!err)
      patientsTableDraw(patients);
  });

}




$(function(){
	
	document.title = $.translate('Patients');
	
	/*
	 *DataTable init
	 */
	$('.patienttable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: patientsColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Patients'), href:'dashboard.html'}]);
		
	/*
	 *request to get all patients
	 */
	
	listenForPatients();
	
	var clearReferenceClasses = function(newclass) {
		$('#edit-patient').removeClass('add-patient').removeClass('edit-patient').addClass(newclass);
		
	};
	
	if (typeof($.patientsInitiated)==='undefined') { //prevent multi event
	
		/*
		 *add plus clicked
		 */
	
		$(document).on('click','.patients .add-item',function(e) {

		  var name = prompt($.translate('Name'));

		  if (!name)
		    return;

		  name=name.split(' ');
		  api('/patient','POST',{firstName:name[0],lastName:name[1]},listenForPatients);
		});
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.patienttable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(patientsData[id].patientname);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */

		
		$(document).on('click','.patienttable .patientClick',function(e){
			
			var patientId=$(this).closest('tr').attr('id');
			loadPage('patient.html,'+patientId);
		});
		
		$.patientsInitiated=true;
	}
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');

    api('patient/'+$('#confirm-delete').attr('rel'),'DELETE',listenForPatients);

	});



	


});

