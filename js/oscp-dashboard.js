/**
 * A simpe and easy to debug javascript file that handles the front end interface.
 * 
 * I make no use of angular,react or even jQuery its pure old school javascript
 * the way it should be !!
 * 
 * LMZ Feb 2017
 * 
 */

let optional=null;
let currentCluster="";
let loggedIn=false;

/**
 * @description Generic handler for sidebar (menu) selection
 * 
 * @param id - server id (from config.json)
 * @param type - either node,project,pod
 * @param optional - only used to pass the project name if type is project
 * @returns void
 */
function pageSelector(id, type, optional) {

  updateTitle(id,optional);

  let nodes = document.getElementsByClassName("pageshow");
  for (let x = 0; x < nodes.length; x++) {
    nodes[x].className = "pageshow fade";
  }

  if (currentCluster !== config.servers[id].name) {
    // do login 
    loggedIn = ocLogin(id);
    currentCluster == config.servers[id].name;
  }


  let page = document.getElementById(config.servers[id].name + "-" + type + (optional ? '-' + optional : ''));
  // we check if the element exists
  if (page) {
    page.className = "pageshow";
  } else {
    let container = document.getElementById('main-container');
    let newDiv = document.createElement('div');
    newDiv.setAttribute("id", config.servers[id].name + "-" + type + (optional ? '-' + optional : ''));
    newDiv.setAttribute("class", "pageshow");
    newDiv.innerHTML = " ";
    container.appendChild(newDiv);

    // min config - look at the sidenav.html and set the names here
    switch (type) {
      case "nodes":
        getNodeStats(id);
        break;

      case "projects":
        getProjects(id, optional);
        break;

      case "pod":
        getProjectPodStatus(id, optional);
        break;
    }
  }
  window.scrollTo(0, 0);
  currentPage = id;
  timerList = [];
  if (timer) clearInterval(timer);
}

/* Simple html include  - really do we need more commenting ? */
function includeHtml() {
  let contents = fs.readFileSync('header.html').toString();
  let header = document.getElementById('header');
  header.innerHTML = contents;
}


function updateMenu(id) {
  //console.log(control);
  el = document.getElementById('submenu-'+id);
  if (el.style.display == "block") {
    el.style.display = 'none';
    el.parentNode.className = "sub-menu dcjq-parent-li";
  } else {
    el.style.display = 'block';
    el.parentNode.className = "sub-menu dcjq-parent-li active";
  }
}

function updateTitle(id,optional) {
  let el = document.getElementById('header-title');
  if (optional) {
    el.innerHTML = " OSCP DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + optional + "]</span>";
  } else {
    el.innerHTML = " OSCP DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + " ]</span>";
  }
}


/* Build sidebar menu */

/**
 * @description Dynamic menu builder from config.json and cached files 
 * 
 */

function buildMenu() {
  let items = config.servers.length;
  let sHtml = "";
  for (let i = 0; i < items; i++) {
    if (config.servers[i].status === "active") {
      sHtml += menuTemplate(i);
    }
  }
  sMenu = "<ul class=\"sidebar-menu\" id=\"nav-accordion\">" + sHtml + "</ul>";
  let el = document.getElementById('sidebar');
  el.innerHTML = sMenu;
}

/* Chart selector */

/**
 * @description Chart selector and timer enabler for individual chart update
 * @param name - chart name
 * @param id - server id
 * @returns void
 */
function selectChart(name, project, id) {
  // name and id and lbl - unique dom id
  let el = document.getElementById(name + '-' + id + '-lbl');
  // mouse button select 
  if (event.button == 0) {
    if (!el.style.color || el.style.color === "white") {
      el.style.color = "#36a2eb";
      timerList.push(name + '-' + id);
    } else {
      el.style.color = "white";
      let index = timerList.indexOf(name + '-' + id);
      timerList.splice(index, 1);
    }
  }
  if (event.button) {
    let el = document.getElementById('header-title');
    if (timer) {
      clearInterval(timer);
    }
    notie.input({
      type: 'text',
      placeholder: 'Time in milliseconds',
      prefilledValue: '10000'
    }, 'Please enter the time interval to refresh charts:', 'Submit', 'Cancel', function (valueEntered) {
      if (isNaN(valueEntered)) {
        timer = setInterval(updateCharts,1000,id,project);
      } else {
        timer = setInterval(updateCharts,valueEntered,id,project);
      }
      el.innerHTML = " OSCP DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + project + " ]</span><span style=\"width:30px;padding-left:40px;font-size:16px;\"><i class=\"fa fa-clock-o\"></i><span>";
    }, function (valueEntered) {
      notie.alert(3, 'Timer stopped', 1);
      timerList = [];
      el.innerHTML = " OSCP DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + project + " ]</span>";
    })
  }
}

/* Node (Server) stats */

/**
 * @description Generic handler to get nodes per server called from sidebar menu
 * 
 * @param id - server id (from config.json)
 * @returns void
 */
function getNodeStats(id) {
  optional = null;
  notie.alert('info', 'Please wait retrieving node stats info for ' + config.servers[id].name, 2);
  buildNodeBarHtml(id);
  let nodes = config.servers[id].nodes.length;
  for (let x = 0; x < nodes; x++) {
    log.debug('Executing : ssh ' + config.servers[id].sshuser + '@' + config.servers[id].nodes[x].addr + ' cat /proc/stat && cat /proc/meminfo');
    exec("ssh " + config.servers[id].sshuser + "@" + config.servers[id].nodes[x].addr + " \" cat /proc/stat && cat /proc/meminfo\"", (error, stdout, stderr) => {
      if (error) {
        log.error(`exec error: ${error}`);
        return;
      }
      buildBarChart(id, config.servers[id].nodes[x].name, calcNodeStats(stdout));
    });
  }
}

/**
 * @description Build html container for node status bar charts
 * 
 * @param id - server id (from config.json)
 * @returns void
 */
function buildNodeBarHtml(id) {
  let sHtml = "";
  let nodes = config.servers[id].nodes.length;
  for (let x = 0; x < nodes; x++) {
    sHtml += barChartTemplate(id,config.servers[id].nodes[x].name);
  }
  let el = document.getElementById(config.servers[id].name + '-nodes');
  el.innerHTML = sHtml;
}

/* Projects */

/**
 * @description Get projects (called from sidebar menu)
 * 
 * @param id - server id (from config.json)
 * @returns void
 */
function getProjects(id) {
  if (fs.existsSync('tmp/' + config.servers[id].name + '-projects.data')) {
    notie.confirm('Use existing project cache for ' + config.servers[id].name, 'Yes', 'No', function () {
      var contents = fs.readFileSync('tmp/' + config.servers[id].name + '-projects.data').toString();
      log.debug('Using cache tmp/' + config.servers[id].name + '-projects.data');
      buildProjectsInfo(id, contents);
    }, function () {
      log.debug('Using oc get projects command');
      ocGetProjectsExecute(id);
    });

  } else {
    ocGetProjectsExecute(id);
  }
}

/**
 * @description Build projects container html
 * 
 * @param id - server id (from config.json)
 * @param data - raw data form oc command or cache
 * @returns void
 */
function buildProjectsInfo(id, data) {
  let sHtml = "";
  let el = null;
  let colormap = [['#57c8f2', '#47b8f2'], ['lightcoral', 'indianred'], ['#f8d347', '#d8c337'], ['#57c8f2', '#47b8f2'], ['lightcoral', 'indianred'], ['#f8d347', '#d8c337']];
  let projects = data.split('\n');
  let colorIndex = 0;

  for (var x = 0; x < projects.length; x++) {
    // check for empty lines
    if (projects[x] !== '') {
      sHtml += projectInfoTemplate(id,projects[x],colormap[colorIndex]);
      if (colorIndex == 2) {
        sHtml = "<tr>" + sHtml + "</tr>";
      } 
      colorIndex++;
      if (colorIndex >= 3) {
        colorIndex = 0;
      } 
    }
  }
  el = document.getElementById(config.servers[id].name + "-projects");
  el.innerHTML = "<table style=\"width:100%;padding:5px\">" + sHtml + "</table>" ;
}

/**
 * @description OC command to get projects with filtering
 * 
 * @param id - server id (from config.json)
 * @returns void
 */
function ocGetProjectsExecute(id) {
  notie.alert('info', 'Please wait gathering project info , this will take a while ...', 2);
  exec("oc get projects | grep -v logging | grep -v openshift | grep -v default | grep -v infra | grep -v kube | grep -v digger | grep -v 'RHMAP Environment' | grep -v NAME | awk '{ print $1 }'", (error, stdout, stderr) => {
    if (error) {
      log.error(`exec error: ${error}`);
      return;
    }
    log.debug(`stdout: ${stdout}`);
    log.debug(`stderr: ${stderr}`);
    log.info('getting project status');
    try { fs.writeFileSync('tmp/' + config.servers[id].name + '-projects.data', stdout); }
    catch (e) { log.error('Failed to save the file !'); }
    buildProjectsInfo(id, stdout);
  });
}

/* Pod list per project (namespace in openshift) */

/**
 * @description Pod list called from sidebar menu
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshift
 * @returns void
 */
function getProjectDetails(id, project) {
  // set our global project variable
  optional=project;
  updateTitle(id, optional);

  if (fs.existsSync('tmp/' + config.servers[id].name + '-' + project + '.data')) {
    notie.confirm('Use existing cache for ' + config.servers[id].name + " " + project, 'Yes', 'No', function () {
      var contents = fs.readFileSync('tmp/' + config.servers[id].name + '-' + project + '.data').toString();
      log.debug('Using cache tmp/' + config.servers[id].name + '-' + project + '.data');
      buildProjectDetailsTable(id, project, contents);
      let el = document.getElementById(config.servers[id].name + "-" + project + "-header");
      el.innerHTML = project + " (cached)";
    }, function () {
      log.debug('Using oc get pods command');
      let el = document.getElementById(config.servers[id].name + "-" + project + "-header");
      el.innerHTML = project;
      ocGetPodsExecute(id, project);
    });
  } else {
    ocGetPodsExecute(id, project);
  }
}

/**
 * @description Build html container for list of pods
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshift
 * @param data - raw data from oc command or cache
 * @returns void
 */
function buildProjectDetailsTable(id, project, data) {
  let sList = data.split("\n");
  let sHtml = "";
  let statusData = "";
  let bgClass = "";

  for (let i = 0; i < sList.length - 1; i++) {
    // ignore first line headers
    if (i > 0) {
      statusData = sList[i].split(':');
      let a = statusData[1].split('/')[0];
      let b = statusData[1].split('/')[1];
      if (a !== b || statusData[2] !== 'Running') {
        if (statusData[2] === 'Completed') {
          bgClass = 'bg-warning';
        } else {
          bgClass = 'bg-important';
        }
      } else {
        bgClass = 'bg-success';
      }
      sHtml += `<tr><td style=\"color: white\">${statusData[0]}</td><td><span class=\"badge ${bgClass}\">${statusData[1]}</span></td><td style=\"color: white\">${statusData[2]}</td></tr>`;
    }
  }
  log.info(config.servers[id].name);
  let el = document.getElementById(config.servers[id].name + "-" + project + "-status");
  el.innerHTML = "<tbody>" + sHtml + "</tbody>";
}

/**
 * @description OC command to get pods
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshift
 * @returns void
 */
function ocGetPodsExecute(id, project) {
  notie.alert('info', 'Please wait retrieving pod info for ' + config.servers[id].name, 2);
  exec('oc get pods -n ' + project + ' | awk \'{print $1":"$2":"$3}\'', (error, stdout, stderr) => {
    if (error) {
      log.error(`exec error: ${error}`);
      return;
    }
    log.debug(`stdout: ${stdout}`);
    log.debug(`stderr: ${stderr}`);
    log.info('getting pod status for project ' + project);
    try { fs.writeFileSync('tmp/' + config.servers[id].name + '-' + project + '.data', stdout); }
    catch (e) { log.error('Failed to save the file !'); }
    buildProjectDetailsTable(id, project, stdout);
  });
}



/* Pod stats */

/**
 * @description Generic handler to get pod status for a specific openshift namespace - called from sidebar menu
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshif
 * @returns void
 */
function getProjectPodStatus(id, project) {
  let data="";
  if (project) {
    notie.alert('info', 'Please wait retrieving pod stats info for ' + config.servers[id].name, 2);
  } else {
    notie.alert('error', 'Please select a project before viewing pod status', 2);
    return false;
  }
  if (fs.existsSync('tmp/' + config.servers[id].name + '-' + project + '.data')) {
    try {
      data = fs.readFileSync('tmp/' + config.servers[id].name + '-' + project + '.data').toString();
    } catch (e) {
      log.error('Failed to save file ' + 'tmp/' + config.servers[id].name + '-' + project + '.data');
      notie.alert('error', 'Project does not exist',2);
      return false;
    }
  }

  buildProjectPodBarHtml(id,project,data);
  ocPodStatusExecute(id,project);
}

/**
 * @description Build html container for pod status bar charts
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshift
 * @param pods - raw pod status data
 * @returns void
 */
function buildProjectPodBarHtml(id, project, pods) {
  let sHtml = "";
  let list = pods.split('\n');
  for (let x = 0; x < list.length-1; x++) {
    // ignore the first line
    if (x > 0) {
      let detail = list[x].split(':');
      if (detail[0].indexOf('initiator') === -1) {
        // call the template function
        sHtml += chartTemplate(id,project,detail);
      }
    }
  }
  let el = document.getElementById(config.servers[id].name + '-pod-' + project);
  el.innerHTML = sHtml;
}

/**
 * @description OC command to get stats for specific process in a pod
 * 
 * @param id - server id (from config.json)
 * @param project - namespace in openshif
 * @returns void
 */
function ocPodStatusExecute(id, project) {
  let allData = {};
  let contents = fs.readFileSync('tmp/' + config.servers[id].name + '-' + project + '.data').toString();
  // clear the file first
  fs.writeFileSync('tmp/stats-' + config.servers[id].name + '-' + project + '.data', '');
  let list = contents.split('\n');
  for (var x = 0; x < list.length-1; x++) {
    let podData = list[x].split(':');
    if (podData[2] === 'Running' && x > 0) {
      exec('oc rsh ' + ' -n ' + project + ' ' + podData[0] + ' /usr/bin/top -b -n 5 -d.2 | grep \'node\\|java\\|mysql\\|mongo\\|redis\\|memcache\\|nagios\\|bash\' | awk \'{print \"' + podData[0] + ':\"$9":"$10}\'', (error, stdout, stderr) => {
        if (error) {
          log.error(`exec error: ${error}`);
          return;
        }
        log.trace(`stdout: ${stdout}`);
        if (stderr) log.error(`stderr: ${stderr}`);
        try { fs.appendFileSync('tmp/stats-' + config.servers[id].name + '-' + project + '.data', stdout); }
        catch (e) { console.log('Failed to save the file !'); }
        buildBarChart(id,podData[0],calcPodStats(stdout));
      });
    }
  }
}


function ocLogin(id, project) {
  let withProject="";
  if (project) {
    withProject = " -n " + project;
  }
  exec("oc login --insecure-skip-tls-verify " + config.servers[id].url + " -u " + config.servers[id].username + " -p \'" + config.servers[id].password + "\' " + withProject, (error, stdout, stderr) => {
    if (error) {
      log.error(`exec error: ${error}`);
      notie.alert('error', 'Login to server ' +  config.servers[id].url  + ' ' + error.toString(), 2);
      return false;
    } else {
      log.info('logged into ' + config.servers[id].url + ' successfully');
      return true;
    }
  });
}


/* Utility functions */

/* Barchart builder */

/**
 * @description Build bar chart
 * 
 * @param id - server id (from config.json)
 * @param name - name of the specific chart (with id forms a unique key)
 * @param data - array with cpu and mem data
 * @returns void
 */
function buildBarChart(id, name, data) {
  chartdata.datasets[0].data = data;
  charts[name + "-" + id] = new Chart(document.getElementById(name + "-" + id), {
    type: 'bar',
    data: JSON.parse(JSON.stringify(chartdata)),
    options: JSON.parse(JSON.stringify(options))
  });
  charts[name + "-" + id].update();
}

/**
 * @description Calculate pod status for cpu and memory usage
 * 
 * @param data - raw data from pod
 * @returns array[cpu,mem]
 */
function calcPodStats(data) {
  let mem = 0.0;
  let cpu = 0.0;
  let list = data.split('\n');
  let details = null;
  let arrData = [];

  for (let i = 0; i < list.length-1; i++) {
    details = list[i].split(':');
    cpu += parseFloat(details[1]);
    mem += parseFloat(details[2]);
  }
  log.debug(" cpu=" + (cpu / (list.length-1)) + " mem=" + (mem / (list.length-1)));
  arrData.push((cpu / (list.length-1)));
  arrData.push((mem / (list.length-1)));
  return arrData;
}

/**
 * @description Calculate node status for cpu and memory usage
 * 
 * @param data - raw data from server
 * @returns array[cpu,mem]
 */
function calcNodeStats(data) {
  let arrData = [];
  let regex = /cpu[\s\d]*/;
  let str = regex.exec(data);
  values = str[0].substr(5).split(' ').map(parseFloat);
  var sum = values.reduce((a, b) => a + b, 0);
  regex = /MemTotal:[\s\d]*/
  str = regex.exec(data);
  let total = parseFloat(str[0].split(':')[1])
  regex = /MemFree:[\s\d]*/
  str = regex.exec(data);
  let free = parseFloat(str[0].split(':')[1]);
  arrData.push(parseFloat(((sum - values[3]) / sum) * 100).toFixed(2));
  arrData.push(parseFloat(((total - free) / total) * 100).toFixed(2));
  return arrData;
}

/* used for demo/testing */

/* good grief no more comments I'm tired */
function updateCharts(id,project) {
  let nodes = timerList.length;
  log.debug('calling updateCharts testmode:' + testmode);
  if (testmode) {
    for (let k = 0; k < nodes; k++) {
      charts[timerList[k]].data.datasets[0].data = [parseFloat(Math.random() * 100).toFixed(2), parseFloat(Math.random() * 100).toFixed(2)];
      charts[timerList[k]].update();
    }
  } else {
    if (project === 'node') {
      for (let x = 0; x < nodes; x++) {
        let nodeId = findNode(id, timerList[x].split('-')[0]);
        log.debug('Executing : ssh ' + config.servers[id].sshuser + '@' + config.servers[id].nodes[nodeId].addr + ' cat /proc/stat && cat /proc/meminfo');
        exec("ssh " + config.servers[id].sshuser + "@" + config.servers[id].nodes[nodeId].addr + " \" cat /proc/stat && cat /proc/meminfo\"", (error, stdout, stderr) => {
          if (error) {
            log.error(`exec error: ${error}`);
            return;
          }
          charts[timerList[x]].data.datasets[0].data = calcNodeStats(stdout);
          charts[timerList[x]].update();
        });
      }
    } else {
      for (let x = 0; x < nodes; x++) {
        exec('oc rsh ' + timerList[x].substr(0,timerList[x].lastIndexOf('-')) + ' /usr/bin/top -b -n 5 -d.2 | grep \'node\\|java\\|mysql\\|mongo\\|redis\\|memcache\\|nagios\\|bash\' | awk \'{print \"' + timerList[x].substr(0,timerList.lastIndexOf('-')) + ':\"$9":"$10}\'', (error, stdout, stderr) => {
          if (error) {
            log.error(`exec error: ${error}`);
            return;
          }
          log.trace(`stdout: ${stdout}`);
          if (stderr) log.error(`stderr: ${stderr}`);
          try { fs.writeFileSync('tmp/deleteme-' + config.servers[id].name + '-' + project + '.data', stdout); }
          catch (e) { console.log('Failed to save the file !'); }
          charts[timerList[x]].data.datasets[0].data = calcPodStats(stdout);
          charts[timerList[x]].update();
        });
      }
    }
  }
}

/* find a node in the config */
function findNode(id,name) {
  let nodes = config.servers[id].nodes.length;
  let nodeId = 0;
  for (let x = 0; x < nodes; x++) {
    if (config.servers[id].nodes[x].name === name) {
      nodeId = x;
    }
  }
  return nodeId;
}


/* templates as functions */
/* keep it simple stupid  */

function chartTemplate(id,project,detail) {

  let sHtml = `<div  style="padding:5px;margin-bottom:110px;width:250px;height:200px;float:left">
    <section class="panel">
      <div style="padding: 8px">
        <canvas id="${detail[0]}-${id}" height="220" width="220" style="display:block; width: 220px; height: 220px; vertical-align: top;">
        </canvas>
      </div>
      <footer id="${detail[0]}-${id}-lbl" onmousedown="javascript:selectChart('${detail[0]}','${project}',${id});" class="chart">${detail[0]}</footer>
    </section>
   </div>`;

  return sHtml;
}

function menuTemplate(id) {
  let name = config.servers[id].name;
  let sHtml =  `<li class="sub-menu dcjq-parent-li">
    <a class="dcjq-parent" href="javascript:updateMenu(${id});">
      <i class="fa fa-laptop"></i>
      <span>${name}</span>
      <span class=\"dcjq-icon\"></span>
    </a>
    <ul id="submenu-${id}" style="display: none;" class="substr">
      <li><a href="javascript:pageSelector(${id},'nodes');">Openshift Nodes</a></li>
      <li><a href="javascript:pageSelector(${id},'projects');">Openshift Projects</a></li>
      <li><a href="javascript:pageSelector(${id},'pod', optional);">Openshift Pods</a></li>
    </ul>
  </li>`;

  return sHtml;
}

function projectInfoTemplate(id, project, colormap) {
  let name = config.servers[id].name;
  let username = config.servers[id].username;
  let sHtml = `<td style="padding:5px;vertical-align: top;"><div onclick="javascript:getProjectDetails(${id},'${project}');" style="cursor: pointer">
    <section class="panel">
      <div style="color: white;height:45px;width:auto;background: ${colormap[0]};border-radius: 4px 4px 0px 0px;padding-top: 0px;">
        <div style="height:45px;width:40px;line-height:50px;background: ${colormap[1]};border-radius: 4px 0px 0px 0px;text-align:center;padding-top: 0px;float:left;">
          <i class="fa fa-bar-chart-o"></i>
        </div>
        <h3 style="padding-top:10px;margin-left:50px;">${name}</h3>
      </div>
      <div style="height:auto;width:auto;float:left;">
        <div style="margin-left: 10px">
          <h4 id="${name}-${project}-header">${project}</h4>
          <p>${username}</p>
        </div>
      </div>
      <table id="${name}-${project}-status" class="table table-hover personal-task">
      </table>
    </section>
  </div></td>`;

  return sHtml;
}

function barChartTemplate(id, name) {
  let sHtml = `<div  style=\"padding:5px;margin-bottom:90px;width:200px;height:180px;float:left\">
    <section class="panel">
      <div style="padding: 8px">
        <canvas id="${name}-${id}" height="100" width="100" style="display:block; width: 100px; height: 100px; vertical-align: top;">
        </canvas>
      </div>
      <footer id="${name}-${id}-lbl" onmousedown="javascript:selectChart('${name}','node',${id});" class="chart">${name}</footer>
    </section>
  </div>`;

  return sHtml;
}
