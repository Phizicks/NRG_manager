/* eslint-disable object-shorthand */

/* global Chart, CustomTooltips, getStyle, hexToRgba */

/**
 * --------------------------------------------------------------------------
 * CoreUI Free Boostrap Admin Template (v2.1.10): main.js
 * Licensed under MIT (https://coreui.io/license)
 * --------------------------------------------------------------------------
 */
var totalCyclerCapacity = 2;
var intervalHandles = Array();
var charts = Array();

/* eslint-disable no-magic-numbers */
// Disable the on-canvas tooltip
Chart.defaults.global.pointHitDetectionRadius = 1;
Chart.defaults.global.tooltips.enabled = true;
Chart.defaults.global.tooltips.mode = 'index';
Chart.defaults.global.tooltips.position = 'nearest';
//Chart.defaults.global.tooltips.custom = CustomTooltips; // eslint-disable-next-line no-unused-vars

const config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            cellid: 1,
            label: 'mV',
            backgroundColor: '#c04040',
            borderColor: '#c04040',
            data: [],
            fill: false,
        }, {
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
            xAxis: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Time'
                }
            }],
            yAxis: [{
                id: 'y-axis-1',
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
                id: 'y-axis-2',
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
}


$(document).ready(function() {
    var configs = [];
    for(slot_id=0; slot_id<totalCyclerCapacity; slot_id++) {
        intervalHandles.push(null);
        configs[slot_id] = JSON.parse(JSON.stringify(config));
        charts[slot_id] = new Chart(document.getElementById('chart'+slot_id).getContext('2d'), configs[slot_id]);
    }
});


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
    charts[slot_id].clear();
    charts[slot_id].update();
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

            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){
                var slot_id = parseInt(item.value) - 1;
                $.ajax({
                    type: "POST",
                    url: "api/charge/" + slot_id,
                    data: serial,
                    success: function(response) {
                        // Start internal and notify success
                        cell_update_interval(slot_id);
                        alert_popup('success', response);
                    }
                }).fail( function(jqXHR, textStatus, errorThrown) {
                    alert_popup('danger', "Status: "+jqXHR.status+" Error: "+jqXHR.responseText)
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
            $(this).closest('form').find('[name="cell"]:checked').each(function(slot_id, item){

                // Clear graphs for cell
                if (charts[slot_id].data['datasets'].length > parseInt(item.value) ) {
                    //chart_slot[slot_id].data.datasets[parseInt(item.value)-1].data = Array();
                    //chart_slot[slot_id].data.labels = Array();
                    charts[slot_id].clear()
                    charts[slot_id].update();
                }
                var slot_id = parseInt(item.value) - 1;
                $.ajax({
                    type: "POST",
                    url: "api/" + func+"/" + (parseInt(item.value) -1),
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response.message);
                        cell_update_interval(slot_id);
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

            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item) {

                // Clear graphs for cell
                if (charts[slot_id].data['datasets'].length > parseInt(item.value) ) {
                    //chart_slot[slot_id].data.datasets[parseInt(item.value)-1].data = Array();
                    //chart_slot[slot_id].data.labels = Array();
                    charts[slot_id].clear();
                    charts[slot_id].update();
                }
                var slot_id = parseInt(item.value) - 1;
                $.ajax({
                    type: "POST",
                    url: "api/" + func+"/" + (parseInt(item.value) -1),
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response.message);
                        cell_update_interval(slot_id);
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

            $(this).closest('form').find('[name="cell"]:checked').each(function(idx, item){
                $.ajax({
                    type: "POST",
                    url: "api/" + func+"/" + (parseInt(item.value) - 1),
                    data: serial,
                    success: function(response) {
                        alert_popup('success', response);
                        stop_cell_interval(intervalHandles[parseInt(item.value) - 1]);
                    }

                }).fail( function(jqXHR, textStatus, errorThrown) {
                    stop_cell_interval((parseInt(item.value) - 1))
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
        console.log("WARN: slot_id interval is already running!");
        return;
    }
    if (slot_id <0 || slot_id> totalCyclerCapacity ) {
        console.log("CRIT: slot_id "+slot_id+" is out of bounds!");
        return;
    }

    iSlot_id = slot_id;
    intervalHandles[slot_id] = setInterval( get_slot_update, 1000, iSlot_id);
}

function get_slot_update(slot_id) {
    $.ajax({
        type: "POST",
        url: "api/status/"+slot_id,
        data: JSON.stringify([{ "name": "action", "value": "status" }]),
        success: function(response) {
            if (response.data[0].length>0 && slot_id != response.data[0].slot_id ) {
                console.log("CRITICAL: Interval_slot_id mismatch to response.data['slot_id']");
            }
            var date = new Date();
            var timeString = date.toISOString().substr(11, 8);

            response.data.forEach(function(data, index) {
                if ( Object.keys(data).length > 0 ) {
                    add_slot_data_to_chart(data);
                }
            });
            if  (response.status == 'State.idle') {
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
}

function addCellData(slot_id, values) {
    // cell data
    $('.voltage .slot'+slot_id+'.text-value').text(values['voltage']);
    $('.watthours .slot'+slot_id+'.text-value').text(values['watthours']);
    $('.current .slot'+slot_id+'.text-value').text(values['current']);
    $('.temp .slot'+slot_id+'.text-value').text(values['temp']);
    $('.amphours .slot'+slot_id+'.text-value').text(values['amphours']);
}

function add_slot_data_to_chart(data) {
    slot_id = data['slot_id'];

    // Add data to cell charts
    addCellData(slot_id, data);

    charts[slot_id].data.datasets[0].data.push(data['voltage']);
    charts[slot_id].data.datasets[1].data.push(data['current']);
    const timestamp = new Date(data['timestamp']*1000)
    charts[slot_id].data.labels.push(timestamp.toLocaleString());

    charts[slot_id].update();
}

//$('#status_stop').on('click', function() {
//    // stop_cell_interval()
//    var slot_id = 0;
//    $.ajax({
//        type: "POST",
//        url: "api/history/"+slot_id,
//        data: '[{"name":"action","value":"history"}]',
//        success: function(response) {
////                console.log(response.message);
//            $.each(response.message, function(_, values) {
//                add_slot_data_to_chart(slot_id, values);
//            });
//        }
//    });
//});
