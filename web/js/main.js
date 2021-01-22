/* eslint-disable object-shorthand */

/* global Chart, CustomTooltips, getStyle, hexToRgba */

/**
 * --------------------------------------------------------------------------
 * CoreUI Free Boostrap Admin Template (v2.1.10): main.js
 * Licensed under MIT (https://coreui.io/license)
 * --------------------------------------------------------------------------
 */
var totalCyclerCapacity = 2;
var intervalHandles = [];
for(i=0; i<totalCyclerCapacity; i++) {
    intervalHandles.push(null);
}
var config_chart = [];
var chart_slot = [];

/* eslint-disable no-magic-numbers */
// Disable the on-canvas tooltip
Chart.defaults.global.pointHitDetectionRadius = 1;
Chart.defaults.global.tooltips.enabled = true;
Chart.defaults.global.tooltips.mode = 'index';
Chart.defaults.global.tooltips.position = 'nearest';
//Chart.defaults.global.tooltips.custom = CustomTooltips; // eslint-disable-next-line no-unused-vars


var config_chart_tpl = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            yAxisID: 'slot0',
            cellid: 1,
            label: 'mV',
            backgroundColor: '#c04040',
            borderColor: '#c04040',
            data: [],
            fill: false,
        }, {
            yAxisID: 'slot1',
            cellid: 2,
            label: 'mA',
            fill: false,
            backgroundColor: '#a0a0c0',
            borderColor: '#a0a0c0',
            data: []
        }]
    },
    options: {
        maintainAspectRatio: false,
        responsive: true,
        title: {
            display: true,
            text: '#text#'
        },
        showTooltips: true,
        tooltips: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Time'
                }
            }],
            yAxes: [{
                id: 'slot0',
                position: 'left',
                ticks: {
                    beginAtZero: true
                },
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'mV'
                }
               }, {
                id: 'slot1',
                position: 'right',
                ticks: {
                    beginAtZero: false,
                    max: 100,
                },
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'mA'
                },
            }]
        }
    }
};


window.onload = function() {
    var ctx_millivolt = document.getElementById('chart-millivolt').getContext('2d');
    for(slot_id=0; slot_id<totalCyclerCapacity; slot_id++) {
        config_chart.push(config_chart_tpl);
        chart_slot.push(new Chart(ctx_millivolt, config_chart[slot_id]));
    }
};

var brandBoxChartLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

function dataset(cellid) {
    return {
      label: 'Cell#'+ (cellid.toString()),
      backgroundColor: 'rgba(255,255,255,.1)',
      borderColor: 'rgba(255,255,255,.55)',
      pointHoverBackgroundColor: '#fff',
      borderWidth: 2,
      data: []
    }
}

var loadDataSet = []
for(i=0; i<totalCyclerCapacity; i++) {
    loadDataSet.push(dataset(i))
}

// Left navbar menu drop down
$('.nav-dropdown-toggle').on('click', function() {
    if ( $(this).parent().hasClass('open') ) {
        $(this).parent().removeClass('open');
    } else {
        $(this).parent().addClass('open');
    }
});

// Side navigation menu for mobile
$('.navbar-toggler.sidebar-toggler.d-lg-none.mr-auto').on('click', function() {
    if ( $("body").hasClass('sidebar-show') ) {
        $("body").removeClass('sidebar-show');
    } else {
        $("body").addClass('sidebar-show');
    }
});

$('.navbar-toggler.sidebar-toggler.d-md-down-none').on('click', function() {
    if ( $("body").hasClass('sidebar-lg-show') ) {
        $("body").removeClass('sidebar-lg-show');
    } else {
        $("body").addClass('sidebar-lg-show');
    }
});

function alert_popup(type, message) {
    var alert = $(".alert-template").clone().removeClass('alert-template').addClass('alert-'+type);
    alert.text(message);
    // Remove immediately if clicked
    $(alert).on('click', function(){
        $(alert).remove();
    });
    // Add to top of page
    $(alert).prependTo(".notifications").hide().slideDown(500);
    // Delay before fade and remove
    setTimeout(function(item){
        $(alert).slideUp(500, function() {
            $(alert).remove();
        });
    }, 5000);
}

function clear_cell_chart(slot_id) {
    console.log("Clearing slot #", slot_id);
    config_chart[slot_id].data.datasets[0].data = [];
    config_chart[slot_id].data.datasets[1].data = [];
    config_chart[slot_id].data.labels = [];
    chart_slot[slot_id].update();
}

$('.btn-submit').on('click', function() {
    func = $(this).val();
    serial = JSON.stringify($(this).closest('form').serializeArray());

    switch( func ) {
        case 'charge':
            var curr = $(this).closest('form').find('[name="current"]').val();
            var volt = $(this).closest('form').find('[name="voltage"]').val();
            var coff = $(this).closest('form').find('[name="cutoff"]').val();
            if ( $(this).closest('form').find('[name="cell"]:checked').length == 0 ) {
                alert_popup('danger', "You must select at least 1 Cell");
                return;
            }
            if ( curr != "" && (curr < 100 || curr > 6000) ) {
                alert_popup('danger', "'Charge current' outside of range [100 >= value <= 1500]");
                return;
            }
            if ( volt != "" && (volt < 2400 || volt > 4500) ) {
                alert_popup('danger', "'Charge voltage' outside of range [2400 >= value <= 4500]");
                return;
            }
            if ( coff != "" && (coff < 50 || coff > 250) ) {
                alert_popup('danger', "'Cutoff Current' outside of range [50 >= value <= 250]");
                return;
            }
            console.log(".btn-submit->click["+func+"] POSTING -> "+serial);

            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){
                // Clear graphs for cell
                if (chart_slot[idx].data['datasets'].length >= parseInt(item.value) ) {
                    clear_cell_chart(parseInt(item.value)-1)
                }

                console.log(".btn-submit->click["+func+"] POSTING -> "+serial);
                var slot_id = item.value -1;
                $.ajax({
                    type: "POST",
                    url: "api/"+func+"/"+slot_id,
                    data: serial,
                    success: function(response) {
                        // Start internal and notify success
                        cell_update_interval(slot_id);
                        alert_popup('success', response.message);
                    }
                }).fail( function(jqXHR, textStatus, errorThrown) {
                    if ( typeof jqXHR.responseJSON == "object" ) {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseJSON.message)
                    } else {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+errorThrown)
                    }
                });
            });

            break;

        case 'discharge':
            var cells = []
//            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){
//                cells.push(item.value)
//            });
            var curr = $(this).closest('form').find('[name="current"]').val();
            var volt = $(this).closest('form').find('[name="voltage"]').val();
            var coff = $(this).closest('form').find('[name="cutoff"]').val();
            if ( $(this).closest('form').find('[name="cell"]:checked').length == 0 ) {
                alert_popup('danger', "You must select at least 1 Cell");
                return;
            }
            if ( discma != "" && (discma < 100 || discma > 1500) ) {
                alert_popup('danger', "'Discharge current' outside of range [100 >= value <= 1500]");
                return;
            }
            if ( cutoffmv != "" && (cutoffmv < 1000 || cutoffmv > 3900) ) {
                alert_popup('danger', "'Cutoff voltage' outside of range [1000 >= value <= 3900]");
                return;
            }

            if ( typeof mode != "undefined" && mode !='cc' && mode > 'stepped' ) {
                alert_popup('danger', "'Mode' must be of Constant Current or Stepped mode");
                return;
            }
            console.log(".btn-submit->click["+func+"] POSTING -> "+serial);
            cell_update_interval()
            $(this).closest('form').find('[name="cell"]:checked').each(function(slot_id, item){

                // Clear graphs for cell
                if (chart_slot[slot_id].data['datasets'].length > parseInt(item.value) ) {
                    config_chart[slot_id].data.datasets[parseInt(item.value)-1].data = [];
                    config_chart[slot_id].data.labels = [];
                    chart_slot[slot_id].update();
                }

                $.ajax({
                    type: "POST",
                    url: "api/"+func+"/"+item.value,
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response.message);
                    }
                }).fail( function(jqXHR, textStatus, errorThrown) {
                    if ( typeof jqXHR.responseJSON == "object" ) {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseJSON.message)
                    } else {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseText)
                    }
                });
            });
            break;

        case 'cycle':
            var discma = $(this).closest('form').find('[name="discma"]').val();
            var cutoffmv = $(this).closest('form').find('[name="cutoffmv"]').val();

            var mode = $(this).closest('form').find('[name="mode"]:checked').val();

            var chrma = $(this).closest('form').find('[name="chrma"]').val();
            var chrmv = $(this).closest('form').find('[name="chrmv"]').val();
            var cutoffma = $(this).closest('form').find('[name="cutoffma"]').val();
            var cycles = $(this).closest('form').find('[name="cycles"]').val();

            cell_update_interval();
            if ( $(this).closest('form').find('[name="cell"]:checked').length == 0 ) {
                alert_popup('danger', "You must select at least 1 Cell");
                return;
            }
            if ( discma != "" && (discma < 100 || discma > 1500) ) {
                alert_popup('danger', "'Discharge current' outside of range [100 >= value <= 1500]");
                return;
            }
            if ( cutoffmv != "" && (cutoffmv < 1000 || cutoffmv > 3900) ) {
                alert_popup('danger', "'Cutoff voltage' outside of range [1000 >= value <= 3900]");
                return;
            }
            if ( typeof mode != "undefined" && mode !='cc' && mode > 'stepped' ) {
                alert_popup('danger', "'Mode' must be of Constant Current or Stepped mode");
                return;
            }
            if ( chrma != "" && (chrma < 100 || chrma > 1500) ) {
                alert_popup('danger', "'Charge Current' outside of range [100 >= value <= 1500]");
                return;
            }
            if ( chrmv != "" && (chrmv < 2400 || chrmv > 4500) ) {
                alert_popup('danger', "'Charge Voltage' outside of range [2400 >= value <= 4500]");
                return;
            }
            if ( cutoffma != "" && (cutoffma < 50 || cutoffma > 250) ) {
                alert_popup('danger', "'Cutoff Current' outside of range [50 >= value <= 250]");
                return;
            }
            if ( cycles != "" && (cycles < 1 || cutoffma > 5000) ) {
                alert_popup('danger', "'Cutoff Current' outside of range [50 >= value <= 250]");
                return;
            }
            console.log(".btn-submit->click["+func+"] POSTING -> "+serial);
            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){

                // Clear graphs for cell
                if (chart_slot[slot_id].data['datasets'].length > parseInt(item.value) ) {
                    config_chart[slot_id].data.datasets[parseInt(item.value)-1].data = [];
                    config_chart[slot_id].data.labels = [];
                    chart_slot[slot_id].update();
                }

                $.ajax({
                    type: "POST",
                    url: "api/"+func+"/"+item.value,
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response.message);
                    }
                }).fail( function(jqXHR, textStatus, errorThrown) {
                    if ( typeof jqXHR.responseJSON == "object" ) {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseJSON.message)
                    } else {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseText)
                    }
                });
            });
            break;

        case 'stop':
            // var cells = []
            if ( $(this).closest('form').find('[name="cell"]:checked').length == 0 ) {
                alert_popup('danger', "You must select at least 1 Cell");
                return;
            }
            console.log(".btn-submit->click["+func+"] POSTING -> "+serial);
            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){
                $.ajax({
                    type: "POST",
                    url: "api/"+func+"/"+item.value,
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response.message);
                    }

                }).fail( function(jqXHR, textStatus, errorThrown) {
                    if ( typeof jqXHR.responseJSON == "object" ) {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseJSON.message)
                    } else {
                        alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseText)
                    }
                });
            });
            break;
    }

});

function stop_cell_interval(slot_id) {
    clearInterval(intervalHandles[slot_id]);
    intervalHandles[slot_id] = null;
}

function cell_update_interval(slot_id){
    if (intervalHandles[slot_id]) {
        return;
    }

    intervalHandles[slot_id] = setInterval( function(slot_id){
        $.ajax({
            type: "POST",
            url: "api/status/"+slot_id,
            data: JSON.stringify([{ "name": "action", "value": "status" }]),
            success: function(slot_data) {
                var date = new Date();
                //date.setSeconds(45); // specify value for SECONDS here
                var timeString = date.toISOString().substr(11, 8);
                console.log("cell_update_interval:"+timeString)
                //config_chart.data.labels.push(timeString);
                hasdata = false;
                //for (const [slot_id, slot_data] of Object.entries(response)) {
                //$.each(response.message, function(slot_id, slot_data) {
                    console.log("cell_update_interval data -> "+JSON.stringify(slot_data));
                slot_data.forEach(function(data, sid) {
                    if ( Object.keys(data).length > 0 ) {
                        hasdata = true;
                        add_slot_data_to_chart(sid, data);
                        const dateObject = new Date(slot_data['timestamp']*1000);
                        config_chart[sid].data.labels.push(dateObject.toLocaleString());
                    }
                });

                if  (hasdata == false) {
                    stop_cell_interval(slot_id)
                }

            }
        }).fail( function(jqXHR, textStatus, errorThrown) {
            if ( typeof jqXHR.responseJSON == "object" ) {
                alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseJSON.message)
            } else {
                alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseText)
            }
        });
    }, 1000, slot_id);
}

function addCellData(k, v) {
    // cell data
    $('.voltage .cell'+v['id']+'.text-value').text(v['voltage']);
    $('.watthours .cell'+v['id']+'.text-value').text(v['watthours']);
    $('.current .cell'+v['id']+'.text-value').text(v['current']);
    $('.temp .cell'+v['id']+'.text-value').text(v['temp']);
    $('.amphours .cell'+v['id']+'.text-value').text(v['amphours']);
}

function add_slot_data_to_chart(slot_id, data) {
    // Add data to cell charts
    addCellData(slot_id, data);
    // Voltage line
    chart_slot[slot_id].data['datasets'][0]['data'].push(data['voltage']);
    chart_slot[slot_id].data['datasets'][1]['data'].push(data['current']);
    const dateObject = new Date(data['timestamp']*1000);

    chart_slot[slot_id].update();
}



/*
    $("#chartjs-size-monitor").resizable({
        resize: function (event, ui) {
            //Update chart size according to its container size.
            $("#chart-millivolt").CanvasJSChart().render();
        }
    });
*/

//    $('#status').on('click', function() {
//        cell_update_interval();
//    });

$('#status_stop').on('click', function() {
    // stop_cell_interval()
    var slot_id = 0;
    $.ajax({
        type: "POST",
        url: "api/history/"+slot_id,
        data: '[{"name":"action","value":"history"}]',
        success: function(response) {
//                console.log(response.message);
            $.each(response.message, function(_, values) {
                add_slot_data_to_chart(slot_id, values);
            });
        }
    });
});


