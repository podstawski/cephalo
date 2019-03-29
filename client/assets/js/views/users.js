/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var usersColumns=[
	{
		title: $.translate("Firstname"),
		data: "firstName",

	},
  {
    title: $.translate("Lastname"),
    data: "lastName",

  },
  { title: $.translate("Username"), data: "username" },
	{ title: $.translate("Email"), data: "email" },
  {
		title: $.translate("Suspended"),
		data: "suspended",
		sortable: false,
		render: function ( data, type, full, meta ) {
			var ch=data==1?'checked':'';
			
			return '<label class="switch switch-default switch-success"><input rel="suspended" type="checkbox" class="switch-input" '+ch+'><span class="switch-label"></span><span class="switch-handle"></span></label>';
		}
	},
    {
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-user"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var usersData={};
var usersDataArray=[];


/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: usersTableDraw
 * called from websocket on data ready
 */
var usersTableDraw = function(data) {

	usersData={};

	var datatable = $('.usertable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
	
		for (var j=0; j<usersColumns.length; j++) {
			if (usersColumns[j].data==null) continue;
			
			if (typeof(data[i][usersColumns[j].data])=='undefined') {
                data[i][usersColumns[j].data]='';
            }
		}
		
		usersData[data[i].DT_RowId] = data[i];

	}
	
	usersDataArray=data;
	
	
	datatable.clear();
  datatable.rows.add(data);
  datatable.draw();
}


var listenForUsers=function(get) {

	api('user',function (err,users) {
    if (!err)
      usersTableDraw(users);
  });

}




$(function(){
	
	document.title = $.translate('Users');
	
	/*
	 *DataTable init
	 */
	$('.usertable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: usersColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Users'), href:'users.html'}]);
		
	/*
	 *request to get all users
	 */
	
	listenForUsers();
	
	var clearReferenceClasses = function(newclass) {
		$('#edit-user').removeClass('add-user').removeClass('edit-user').addClass(newclass);
		
	};
	
	if (typeof($.usersInitiated)==='undefined') { //prevent multi event
	
		/*
		 *add plus clicked
		 */
	
		$(document).on('click','.users .add-item',function(e) {
			clearReferenceClasses('add-user');
			$('#edit-user').modal('show');
			$('#edit-user .modal-header h4').text($.translate('New user'));
			
			$.smekta_file('views/smekta/add-user.html',null,'#edit-user .modal-body',function(){
				$('#edit-user .modal-body .translate').translate();
				
				setTimeout(function(){$('#edit-user .modal-body input').val('');},500);
				
			});
					
					
		});
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.usertable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(usersData[id].username);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.usertable td a.btn-info',function(e){
			
			clearReferenceClasses('edit-user');
			$('#edit-user').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-user').attr('rel',id);
			$('#edit-user .modal-header h4').text(usersData[id].username);

			usersData[id].allProjects = JSON.parse(JSON.stringify(globalProjects));
			
			console.log(usersData[id]);

			
			
			$.smekta_file('views/smekta/edit-user.html',usersData[id],'#edit-user .modal-body',function(){
				$('#edit-user .modal-body .translate').translate();
				setTimeout(function(){$('#edit-user .modal-body input[type="password"]').val('');},500);
				
				$('#edit-user .modal-body select').select2();
			});	
			
		});
		
		$(document).on('click','.usertable .switch input',function(e){
			
			var userId=$(this).parent().parent().parent().attr('id');
			var field=$(this).attr('rel');
			var data={};
			data[field]=$(this).prop('checked')?1:0;
			api('user/'+userId,'PUT',data);
			//websocket.emit('db-save','users',data,'username');
			usersData[userId][field]=data[field];
		});
		
		$.usersInitiated=true;
	}
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');

    api('user/'+$('#confirm-delete').attr('rel'),'DELETE',listenForUsers);

	});

	/*
	 *save button in user edit
	 */
	$('#edit-user .btn-info').click(function(e){

		var userId=$('#edit-user').attr('rel');

    var data={};
		$('#edit-user input,#edit-user select').each(function(){
			if(typeof($(this).attr('name'))!='undefined') data[$(this).attr('name')]=$(this).val();
		});
		
		if ($('#edit-user').hasClass('add-user')) {


      $('#edit-user').modal('hide');
      api('user','POST',data,function(err){
        listenForUsers(true);
      });
		}
		
		
		if ($('#edit-user').hasClass('edit-user')) {
			  $('#edit-user').modal('hide');

				if (data.password.trim().length===0) {
          delete(data.password);
				}

				api('user/'+userId,'PUT',data,function(err){
          listenForUsers(true);
        });
			



		}
		
		
	});

	


});

