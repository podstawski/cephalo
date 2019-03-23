$(function(){

    toastr.info($.translate('Dento-Medical cephalo panel'), 'Welcome to', {
        closeButton: true,
        progressBar: true,
    });

    /*
    websocket.emit('collections');
    websocket.once('collections',function(collections){
        
     
        var a=[];
        
        for (var k in collections) {
            collections[k].symbol=k;
            switch (collections[k].temp) {
                case 0:
                    collections[k].type="warning";
                    break;
                case -1:
                    collections[k].type="info";
                    break;
                case 1:
                    collections[k].type="danger";
                    break;
            }
            a.push(collections[k]);
        }
        console.log(a);
        $.smekta_file('views/smekta/collection-card.html',{cards:a},'.collection-cards',function(){
        
    
            for (var k in collections) {
                
                var labels = [];
                var values=[];
                for (var i=0; i<collections[k].data.length; i++ ) {
                    labels.push(new Date(collections[k].data[i].date));
                    values.push(parseFloat(collections[k].data[i].value));
                }
                

                
                var data = {
                    labels: labels,
                    datasets: [
                        {
                            label: collections[k].name.substr(0,5)+'...',
                            fill: true,
                            lineTension: 0,
                            borderColor: "rgba(20,20,192,1)",
                            borderCapStyle: 'butt',
                            borderDash: [],
                            borderDashOffset: 0.0,
                            borderJoinStyle: 'miter',
                            pointBorderColor: "rgba(75,75,75,1)",
                            pointBackgroundColor: "#fff",
                            pointBorderWidth: 1,
                            pointHoverRadius: 5,
                            pointHoverBackgroundColor: "rgba(75,192,192,1)",
                            pointHoverBorderColor: "rgba(220,220,220,1)",
                            pointHoverBorderWidth: 2,
                            pointRadius: 1,
                            pointHitRadius: 10,
                            data: values
                        },
                    ]
                };
                var ctx = $('#card-'+k).get(0).getContext('2d');
              
                
                var chrt = new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true,
                        legend: {
                            display: false  
                        },
                        scales: {
                            xAxes: [{
                                type: 'time',
                                time: {
                                    unit: 'hour',
                                    displayFormats: {
                                        hour: 'H:mm'
                                        
                                    }
                                },
                                ticks: {
                                    fontSize: 10
                                }
                            }]}
                    }

                });

            }
        
        
        });
    });
    */

});
