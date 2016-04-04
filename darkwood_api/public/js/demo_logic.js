//Generic functions
//Return the difference between the date and now (in seconds)
function get_seconds_now(date) {

	//To get the seconds (info age)
	var currentTime = new Date();
	currentTime = currentTime.getTime() /1000;
	
	var infoTime = new Date(date);
	infoTime = (infoTime.getTime() /1000);
	
	//to account for the time zone
	infoTime = infoTime - (60*60);

	return Math.floor(currentTime-infoTime);
}

/*************
***INSTANCE***
*************/

//Get just status of specific trigram
function get_status(host,trigram,callback) {
    $.ajax({
        type: "GET",
        url: "/api/"+host+"/websphere/"+trigram+"/was-"+trigram+"-1/status",
        success: function (result) { 
			return callback(result);
		},
		error: function(err) {
			return callback(err);
		}
    });
}

//bch status controller
function bch_status() {
	var trigram = "bch";
	get_status("s00vl9937879",trigram, function(result,err) {
		if(err) {
			console.log("ERROR");
			console.log(err);
		}
		else {
			$("#"+trigram+"_status").text(result['data']);
			$("#"+trigram+"_date").text(get_seconds_now(result['date']));
			
			if(result['data'] == "STOPPED") {
				$("#"+trigram+"_class").attr('class', 'danger');
			}
			else {
				$("#"+trigram+"_class").attr('class', 'success');
			}
		}
	}		
)};


/*************
***HOST***
*************/

//Get Everything
function get_host(host, callback) {
    $.ajax({
        type: "GET",
        url: "/api/"+host+"/websphere/",
        success: function (result) { 
			return callback(null, result);
		},
		error: function(err) {
			return callback(err, null);
		}
    });
}

//all information controller
function host_info(host) {
	get_host(host, function(err, result) {
		//If Error
		if(err){
			console.log("ERROR");
			console.log(err);
		}
		//Success
		else{
			//just the websphere information(HTTPS and WAS)
			var info = result['data']['nodes'][host];
			
			var row = "<tr id=\"INSTANCE\" class=\"COLOR\"><td>INSTANCE</td><td>HOST</td><td id=\"INSTANCE_status\">STATUS</td><td id=\"INSTANCE_date\">DATE</td></tr>";
			
			for (var trigram in info) {
				//status is not a trigram :)
				if (trigram != "status") {
					for (var instance in info[trigram]) {
					
						if (instance.startsWith("was")) {
					
							//change line
							if($('#' + instance).length) {
								$("#"+instance+"_status").text(info[trigram][instance]['status']);
								$("#"+instance+"_date").text(get_seconds_now(result['date']));

								//STOPPED or NOT
								if(info[trigram][instance]['status'] == "STOPPED") {
									$("#"+instance).attr('class', 'danger');
								}
								else{
									$("#"+instance).attr('class', 'success');
								}
							}
							//add line
							else {
								var new_row = row;
								new_row = new_row.split("INSTANCE").join(instance);
								new_row = new_row.split("HOST").join(host);
								new_row = new_row.split("STATUS").join(info[trigram][instance]['status']);
								new_row = new_row.split("DATE").join(get_seconds_now(result['date']));
								
								//STOPPED or NOT
								if (info[trigram][instance]['status'] == "STOPPED") {
									new_row = new_row.split("COLOR").join('danger');
								}
								else {
									new_row = new_row.split("COLOR").join('success');
								}

								$('#host_info tr:last').after(new_row);
							}
						}
					}
				}
			}
		}
	}
)};


/*******************
***INFRASTRUCTURE***
*******************/


//all information controller
function infrastructure_info(host, type) {
	get_host(host, function(err, result) {
		//If Error
		if(err){
			console.log("ERROR");
			console.log(err);
		}
		//Success
		else{
			//just the websphere information(HTTPS and WAS)
			var info = result['data']['nodes'][host];
			
			var row = "<tr id=\"INSTANCE_HOST\" class=\"COLOR\"><td>INSTANCE</td><td>HOST</td><td id=\"INSTANCE_HOST_status\">STATUS</td><td id=\"INSTANCE_HOST_date\">DATE</td></tr>";
			
			for (var trigram in info) {
				//status is not a trigram :)
				if (trigram != "status") {
					for (var instance in info[trigram]) {
						
						if (instance.startsWith(type)) {
							
							//change line
							if($('#' +instance+"_"+host).length) {
								$("#"+instance+"_"+host+"_status").text(info[trigram][instance]['status']);
								$("#"+instance+"_"+host+"_date").text(get_seconds_now(result['date']));

								//STOPPED or NOT
								if(info[trigram][instance]['status'] == "STOPPED") {
									$('#' +instance+"_"+host).attr('class', 'danger');
								}
								else{
									$('#' +instance+"_"+host).attr('class', 'success');
								}
							}
							//add line
							else {
								var new_row = row;
								new_row = new_row.split("INSTANCE").join(instance);
								new_row = new_row.split("HOST").join(host);
								new_row = new_row.split("STATUS").join(info[trigram][instance]['status']);
								new_row = new_row.split("DATE").join(get_seconds_now(result['date']));
								
								//STOPPED or NOT
								if (info[trigram][instance]['status'] == "STOPPED") {
									new_row = new_row.split("COLOR").join('danger');
								}
								else {
									new_row = new_row.split("COLOR").join('success');
								}
								$('#'+type+'-'+host+'_info tr:last').after(new_row);
							}
						}
					}
				}
			}
		}
	}
)};



/*************
***TRIGGERS***
*************/

//Triggers every X milliseconds
//Single instance trigger
$(function() {
	bch_status();
	var interval = setInterval(function() {
		bch_status();
	}, 15000);
});


//Triggers every X milliseconds
//Host trigger
$(function() {
	host_info("s00vl9937879");
	var interval = setInterval(function() {
		host_info("s00vl9937879");
	}, 15000);
});

//Triggers every X milliseconds
//Infrastructure trigger
$(function() {
	
	var activeTab = null;
	var instance_type = null;
	var host = null;
	$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
		
		//what tab is selected
		activeTab = $(e.target).attr('id');
		//was or http
		instance_type = activeTab.substring(0,activeTab.indexOf("-"));
		//host
		host = activeTab.substring(activeTab.indexOf("-")+1,activeTab.length-"-tab".length);
	
		infrastructure_info(host,instance_type);	
		
		$("html, body").animate({ scrollTop: $(document).height() }, "slow");	
	});
	
	var interval = setInterval(function() {
		if (activeTab) {
			infrastructure_info(host,instance_type);
		}
		
	}, 15000);
});