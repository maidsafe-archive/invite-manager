var BASE_URL = location.protocol + '//' + location.host;
var HOST = BASE_URL + location.pathname.split('/').slice(0, -1).join('/') + '/';
var loadingEle = $('#loading');
var inviteCntrClass = 'invite';
var ackInviteClass = 'ack-invite';
var hasInviteClass = 'has-invite';
var manageInviteClass = 'manage-invite';
var inviteURLClass = 'invite-url';
var adminClass = 'admin';
var superAdminClass = 'super-admin';
var TESTNET_SELECTION =  'TESTNET_SELECTION';

var ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user'
};

function storeTestnetSelection(val) {
  window.localStorage.setItem(TESTNET_SELECTION, val);
}

function fetchTestnetSelection() {
  return window.localStorage.getItem(TESTNET_SELECTION);
}

function post(url, data, headers) {
  return axios.post(BASE_URL + url, data, headers ? headers : {});
}

function setTestnetTitle() {
  var title = fetchTestnetSelection();
  if (!title) {
    return;
  }
  $('#testnetTitle').html(title.replace('-', ' ').toUpperCase());
}

function get(url) {
  return axios.get(BASE_URL + url);
}

function deleteReq(url) {
  return axios.delete(BASE_URL + url);
}

function goTo(page, toNewPage) {
  var path = location.pathname.split('/').slice(0, -1).join('/');
  if (toNewPage) {
    return window.open(path + page);
  }
  location.assign(path + page);
}

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function displayCntr(className, state) {
  var ele = $('.' + className);
  if (!state) {
    $(ele).hide();
    return;
  }
  $(ele).show();
}

function setLoading(state) {
  if (state) {
    loadingEle.addClass('show');
    return;
  }
  loadingEle.removeClass('show');
}

function getTestnetFromQuery() {
    if (location.search) {
        var param;
        var tokens = location.search.replace('?', '').split('&');
        for (let i = 0; i < tokens.length; i++) {
            param = tokens[i].split('=');
            if (param[0] === 'testnet') {
                return param[1];
            }
        }
    }
    return;
}

function getInviteData(token) {
    let url = '/invite/' + token;
    let testnet = getTestnetFromQuery();
    if (testnet) {
        url += ('/' + testnet);
    }
  return get(url);
}

function resetIP(token) {
  let url = '/invite/resetIp/' + token;
  let testnet = getTestnetFromQuery();
  if (testnet) {
    url += ( '/' + testnet);
  }
  return post(url, {
    withCredentials: true
  });
}

function getProfile() {
  return get('/profile');
}

function initClipboard() {
  new Clipboard('.invite-token-copy');
  // new Clipboard('.old-invite-token-copy');
}

function onClickToggleTableView(ele) {
 var tableBaseEle = $(ele).parents('.table-view-b');
 if(tableBaseEle.hasClass('show')) {
   tableBaseEle.removeClass('show');
   $(ele).html('Show Table');
 } else {
   tableBaseEle.addClass('show');
   $(ele).html('Hide Table')
 }
}

function onClickOpenStats() {
  goTo('/stats.html', true);
}

function onClickUpdateIP() {
  var token = $('#copyToken').val();
  setLoading(true);
  resetIP(token)
    .then(function (res) {
      alert('Your IP is updated to ' + res.data.ip);
      setLoading(false);
      setInvite(res.data.invite, res.data.ip);
      return res.data.ip;
    })
    .then(function (ip) {
      setLoading(true);
      return getProfile()
        .then(function (res) {
          setLoading(false);
          setCurrentIp(ip, res.data.cip);
        }).catch(function (err) {
          setLoading(false);
          setCurrentIp(ip, err.cip || err.data.cip);
        });
    }).catch(function (err) {
    setLoading(false);
    alert('Error : ', err.message);
  })
}

function onClickAssignUser(e) {
  var nameEle = $('#userName');
  var name = nameEle.val();
  if (!name) {
    alert('Name or Email should not be empty.');
    return;
  }
  e.preventDefault();
  setLoading(true);
  get('/assignInvite/' + name)
    .then(function (res) {
      setLoading(false);
      displayCntr(inviteURLClass, true);
      var path = HOST + 'update_ip.html?invite=' + res.data.token + '&testnet=' + res.data.testnet;
      nameEle.val('');
      var linkEle = $('#userInviteLink');
      linkEle.attr('href', path);
      linkEle.html(path);
    })
    .catch(function (err) {
      setLoading(false);
      alert('Error:' + err.message);
    });
}

function onClickCloseInviteUrl() {
  displayCntr(inviteURLClass, false);
}

function onClickClearDb() {
  setLoading(true);
  get('/clearDatabase')
    .then(function (res) {
      setSuperAdminPage();
      setLoading(false);
      alert('Cleared database');
    }).catch(function (err) {
    setLoading(false);
    setSuperAdminPage();
    alert('Error : ', err.message);
  })
}

function onClickAddAdmin() {
  var userNameEle = $('#adminName');
  var userName = userNameEle.val();
  if (!userName) {
    alert('Username should not be empty.');
    return;
  }
  userNameEle.val('');
  setLoading(true);
  post('/admin', {
    userName: userName
  }).then(function (res) {
    setLoading(false);
    alert('Admin added');
  }).catch(function (err) {
    setLoading(false);
    alert('Error:' + err.message);
  });
}

function onClickAddTokens() {
  var tokenEle = $('#tokensTextArea');
  var tokens = tokenEle.val();
  if (!tokens) {
    return alert('Tokens field should be empty.');
  }
  var tokenArr = tokens.split('\n').map(function (token) {
    return token.trim();
  });
  setLoading(true);
  tokenEle.val('');
  post('/invite', { tokens: tokenArr }, { 'content-type': 'application/json' })
    .then(function (res) {
      setLoading(false);
      setSuperAdminPage();
      alert('Invites added');
    }).catch(function (err) {
    setLoading(false);
    alert('Error:' + err.message);
  });
}

function onClickDeleteTokens() {
  setLoading(true);
  deleteReq('/invite/clearAll')
    .then(function (res) {
      setLoading(false);
      setSuperAdminPage();
      alert('Deleted all tokens');
    }).catch(function (err) {
    setLoading(false);
    setSuperAdminPage();
    alert('Error : ' + err.message);
  });
}

function onClickAddIPs() {
  var proxyEle = $('#proxyTextArea');
  var proxies = proxyEle.val();
  if (!proxies) {
    return alert('Proxy field should be empty.');
  }
  var proxyArr = proxies.split('\n').map(function (ip) {
    return ip.trim();
  });
  setLoading(true);
  proxyEle.val('');
  post('/networkProxy', { ipList: proxyArr }, { 'content-type': 'application/json' })
    .then(function (res) {
      setLoading(false);
      setSuperAdminPage();
      alert('Proxies added');
    }).catch(function (err) {
    setLoading(false);
    alert('Error:' + err.message);
  });
}

function onClickDeleteProxies() {
  setLoading(true);
  deleteReq('/networkProxy/clearAll')
    .then(function (res) {
      setLoading(false);
      setSuperAdminPage();
      alert('Deleted all proxies');
    }).catch(function (err) {
    setLoading(false);
    setSuperAdminPage();
    alert('Error : ' + err.message);
  });
}

function onClickManage() {
  getProfile()
    .then(function (res) {
      var role = res.data.role.toLowerCase();
      if (role === ROLES.ADMIN) {
        goTo('/admin.html');
        return;
      }
      if (role === ROLES.SUPER_ADMIN) {
        goTo('/super_admin.html');
        return;
      }
      displayCntr(manageInviteClass, false);
    });
}

function enableTabbing() {
  $('.tab-nav .tab-nav-i').on('click', function (e) {
    var targetEle = e.target;
    var target = targetEle.dataset.target;
    $('.super-admin-b .tab-nav-i').removeClass('active');
    $(targetEle).addClass('active');
    $('.super-admin-b .tab-cntr-i').hide();
    $('#' + target).parent().show();
  });
}

function setTokensList(tokens, isUsed, clear) {
  var tokenListEle = $('#tokensList');
  if (clear) {
    tokenListEle.html('');
  }
  for (var i = 0; i < tokens.length; i++) {
    if (isUsed) {
      tokenListEle.append('<li class="used">' + tokens[i].token + '</li>')
    } else {
      tokenListEle.append('<li>' + tokens[i].token + '</li>')
    }
  }
}

function setProxiesList(proxies) {
  var proxyEle = $('#proxiesList');
  proxyEle.html('');
  for (var i = 0; i < proxies.length; i++) {
    proxyEle.append('<li>' + proxies[i].ip + '</li>')
  }
}

function setCurrentIp(ip, cip) {
  $('#currentInviteIP').html(cip || 'not set');
  var updateIpBtn = $('#updateIp');
  if (!ip) {
    updateIpBtn.html('Set IP')
  }
  updateIpBtn.prop('disabled', (ip === cip));
}

function setInvite(invite, ip) {
  $('#copyToken').val(invite);
  $('#inviteIP').html(ip || 'not set');
}

function setUpdateIpPage() {
  setTestnetTitle();
  setLoading(true);
  displayCntr(inviteCntrClass, false);
  displayCntr(ackInviteClass, false);
  displayCntr(hasInviteClass, false);
  displayCntr(manageInviteClass, false);
  initClipboard();
  var displayManageBtn = function (role) {
    role = role.toLowerCase();
    if ((role === ROLES.ADMIN) || (role === ROLES.SUPER_ADMIN)) {
      displayCntr(manageInviteClass, true);
    }
  };

  var parsedURL = new URL(location.href);
  var toRedirect = JSON.parse(parsedURL.searchParams.get('auto_redirect'));
  var invite = parsedURL.searchParams.get('invite');

  var displayInvitePage = function (invite, ip) {
    setLoading(false);
    displayCntr(inviteCntrClass, true);
    displayCntr(hasInviteClass, true);
    setInvite(invite, ip);
  };

  if (invite) {
    getInviteData(invite)
      .then(function(inviteData) {
        displayManageBtn(inviteData.data.role);
        setCurrentIp(inviteData.data.ip, inviteData.data.cip);
        displayInvitePage(invite, inviteData.data.ip);
        setLoading(false);
      })/*.catch(function (err) {
      displayManageBtn(ROLES.ADMIN);
      setCurrentIp('::1', '::1');
      displayInvitePage(invite, '::1');
      setLoading(false);
    })*/  ;
  }
}

function setAdminPage() {
  setTestnetTitle();
  setLoading(true);
  displayCntr(inviteURLClass, false);
  displayCntr(adminClass, false);
  getProfile()
    .then(function (res) {
      setLoading(false);
      if (res.data.role.toLowerCase() !== ROLES.ADMIN && res.data.role.toLowerCase() !== ROLES.SUPER_ADMIN) {
        goTo('/404.html')
      }
      displayCntr(adminClass, true);
    })
    .catch(function (err) {
      setLoading(false);
    });
}

function setSuperAdminPage() {
  setTestnetTitle();
  setLoading(true);
  displayCntr(inviteURLClass, false);
  displayCntr(superAdminClass, false);
  getProfile()
    .then(function (res) {
      // setLoading(false);
      if (res.data.role.toLowerCase() !== ROLES.SUPER_ADMIN) {
        goTo('/404.html')
      }
      displayCntr(superAdminClass, true);
      enableTabbing();
      get('/invite/used')
        .then(function (res) {
          setTokensList(res.data, true, true);
          return get('/invite/unused')
        })
        .then(function (res) {
          setTokensList(res.data);
          return get('/networkProxy');
        })
        .then(function (res) {
          setProxiesList(res.data);
          setLoading(false);
        });
    })
    .catch(function (err) {
      setLoading(false);
    });
}

function setAuthResponse() {
  setTestnetTitle();
  var parsedURL = new URL(location.href);
  var info = parsedURL.searchParams.get('info');
  var err = parsedURL.searchParams.get('err');
  var role = parsedURL.searchParams.get('role');
  role = role ? role.toLowerCase() : role;

  var baseEle = $('#authRes');
  var infoEle = baseEle.children('.info-b');
  var errEle = baseEle.children('.error-b');
  displayCntr(manageInviteClass, false);
  $(baseEle).removeClass('error');
  if (info) {
    $(infoEle).html(info);
  } else if (err) {
    $(baseEle).addClass('error');
    $(errEle).html(err);
  } else {
    goTo('/404.html');
  }

  setLoading(true);
  getProfile()
    .then(function (res) {
      setLoading(false);
      var role = res.data.role ? res.data.role.toLowerCase() : null;
      if ((role === ROLES.ADMIN) || (role === ROLES.SUPER_ADMIN)) {
        displayCntr(manageInviteClass, true);
      }
    });
}

function trimInvite(invite) {
  return invite.substr(0, 4) + '...' + invite.substr(-4);
}

function setAssignedInviteTable(data) {
  var assignedInviteTable = $('#assignedInviteTable');
  assignedInviteTable.html('');
  var len = data.length;
  if (len === 0) {
    assignedInviteTable.html('<div class="table-row default">No invites found</div>');
  } else {
    $('#manualInvitesCount').html('('+ len +' Invite' + (len === 1 ? ')' : 's)'));
    for (var i=0; i < len; i++) {
      assignedInviteTable.append('<div class="table-row" title="'+data[i].token+'">' +
       '<div class="table-row-i">'+ trimInvite(data[i].token) +'</div>'+
        '<div class="table-row-i">'+ data[i].assignedTo +'</div>'+
          '<div class="table-row-i">'+ (data[i].assignedBy.userName || data[i].assignedBy.email) +'</div>'+
        '<div class="table-row-i">'+ (data[i].ip || 'not set') +'</div>'+
        '</div>');
    }
  }
}

function setUsedInviteTable(data) {
  var usedInviteTable = $('#usedInviteTable');
  usedInviteTable.html('');
  var len = data.length;
  if (len === 0) {
    usedInviteTable.html('<div class="table-row default">No invites found</div>');
  } else {
    $('#forumInvitesCount').html('('+ len +' Invite' + (len === 1 ? ')' : 's)'));
    for (var i=0; i < len; i++) {
      usedInviteTable.append('<div class="table-row" title="'+data[i].token+'">' +
        '<div class="table-row-i">'+ trimInvite(data[i].token) +'</div>'+
        '<div class="table-row-i">'+ (data[i].claimedBy.userName || data[i].claimedBy.email) +'</div>'+
        '<div class="table-row-i">'+ (data[i].ip || 'not set') +'</div>'+
        '</div>');
    }
  }
}

function setProxyTable(data) {
  var usedInviteTable = $('#proxyTable');
  usedInviteTable.html('');
  var len = data.length;
  if (len === 0) {
    usedInviteTable.html('<div class="table-row default">No proxies found</div>');
  } else {
    $('#proxiesCount').html('('+ len +' Proxies)');
    for (var i=0; i < len; i++) {
      usedInviteTable.append('<div class="table-row" title="'+data[i].ip+'">' +
        '<div class="table-row-i">'+ data[i].ip +'</div>'+
        '</div>');
    }
  }
}

function setInviteCount(invitesCount) {
  $('#consumedInviteCount').html(invitesCount.consumed);
  $('#availableInvites').html(invitesCount.available);
  $('#assignedInvites').html(invitesCount.assigned);
  $('#assignedButNotUsedInvites').html(invitesCount.assignedButNotUsed);
  $('#forumNotUsedInvite').html(invitesCount.forumNotUsed);
}

function setStats() {
  setTestnetTitle();
  setLoading(true);
  get('/invite/stats')
    .then(function (res) {
      setLoading(false);
      var data = res.data;
      setInviteCount({
        consumed: data.consumed,
        assigned: data.assigned,
        available: data.available,
        assignedButNotUsed: data.notUsed,
        forumNotUsed: data.forumNotUsed
      });
      setAssignedInviteTable(data.assignedInvites);
      setUsedInviteTable(data.consumedInvites);
      setLoading(true);
      return get('/networkProxy');
    })
    .then(function (res) {
      setProxyTable(res.data);
      setLoading(false);
    });
}

function selectTestnet(ele) {
  var testnet = ele.dataset.name;
  if (!testnet) {
    return;
  }
  storeTestnetSelection(testnet);
  goTo('/testnet/' + testnet);
}

function setTestnetList(list) {
  var ele = $('#testnetList');
  ele.html('');
  for (var i=0; i< list.length; i++) {
    ele.append('<li data-name="'+list[i]+'" onclick="selectTestnet(this)">'+list[i]+'</li>');
  }
}

function setChooser() {
  setLoading(true);
  get('/testnet')
    .then(function (res) {
      console.log('res', res.data)
      setTestnetList(res.data);
      setLoading(false);
    })
}

$(function () {
  var page = location.pathname.split('/').slice(-1).toString();
  switch (page) {
    case 'update_ip.html':
      setUpdateIpPage();
      break;
    case 'admin.html':
      setAdminPage();
      break;
    case 'super_admin.html':
      setSuperAdminPage();
      break;
    case 'auth_response.html':
      setAuthResponse();
      break;
    case 'stats.html':
      setStats();
      break;
    case 'chooser.html':
      setChooser();
      break;
    default:
      goTo('/404.html');
      throw new Error('Unknown page');
  }
});