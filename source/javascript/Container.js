enyo.kind({
	name: "Spaz.Container",
	flex: 1,
	kind: enyo.VFlexBox,
	style: "background-color: black",
	events: {
		onRefreshAllFinished: "",
		onShowAccountsPopup: ""
	},
	columnData: [],
	components: [
		{kind: "Spaz.Notifier", name:"notifier"},

		{name:"columnsScroller", kind: "SnapScroller", className: "enyo-hflexbox", flex: 1, vertical: false, autoVertical: false, style: "background-color: black; padding: 2px;", components:[
		]},

		{name: "confirmPopup", kind: "enyo.Popup", scrim : true, components: [
			{content: enyo._$L("Delete Column?")},
			{style: "height: 10px;"},
			{kind: "enyo.HFlexBox", components: [
				{kind: "enyo.Button", caption: enyo._$L("Cancel"), flex: 1, onclick: "cancelColumnDeletion"},
				{kind: "enyo.Button", className: "enyo-button-negative", caption: enyo._$L("Delete"), flex: 1, onclick: "confirmColumnDeletion"}
			]}
		]}
	],


	create: function(){
		this.inherited(arguments);

		this.loadingColumns = 0;
		this.loadAndCreateColumns();

		AppUI.addFunction("search", function(inQuery, inAccountId){
			this.createColumn(inAccountId, "search", inQuery);
		}, this);
		AppUI.addFunction("rerenderTimelines", function(){
			this.columnsFunction("refreshList");
		}, this);
		AppUI.addFunction("removeEntryById", function(inEntryId) {
			this.removeEntryById(inEntryId);
		}, this);
		AppUI.addFunction("addEntryToNotifications", function(inEntry) {
			this.$.notifier.addEntry(inEntry);
		}, this);
		AppUI.addFunction("raiseNotifications", function() {
			this.$.notifier.raiseNotifications();
		}, this);
	},

	loadAndCreateColumns: function() {
		this.columnData = App.Prefs.get('columns') || [];
		this.createColumns();
	},

	getDefaultColumns: function(inAccountId) {
		if(!inAccountId) {
			var firstAccount = App.Users.getAll()[0];
			if ((firstAccount) && (firstAccount.id)) {
				inAccountId = firstAccount.id;
			}
		}

		if (!inAccountId) {
			AppUtils.showBanner(enyo._$L('No accounts! You should add one.'));
			setTimeout(enyo.bind(this, this.doShowAccountsPopup, 1));
			return [];
		}

		var default_columns = [
			{type: SPAZ_COLUMN_HOME, accounts: [inAccountId], id: _.uniqueId(new Date().getTime())},
			{type: SPAZ_COLUMN_MENTIONS, accounts: [inAccountId], id: _.uniqueId(new Date().getTime())},
			{type: SPAZ_COLUMN_MESSAGES, accounts: [inAccountId], id: _.uniqueId(new Date().getTime())}
		];

		return default_columns;
	},

	createColumns: function() {
		this.$.columnsScroller.destroyControls();

		if(this.columnData.length === 0){
			this.columnData = this.getDefaultColumns();
		}
		var cols = [];

		for (var i = 0; i < this.columnData.length; i++) {
			if(!this.columnData[i].id){
				this.columnData[i].id = _.uniqueId(new Date().getTime());
			}
			var col = {
				name:'Column'+i,
				info: this.columnData[i],
				kind: "Spaz.Column",
				onDeleteClicked: "deleteColumn",
				onLoadStarted: "loadStarted",
				onLoadFinished: "loadFinished",
				onMoveColumnLeft: "moveColumnLeft",
				onMoveColumnRight: "moveColumnRight",
				owner: this,

				onToolbarmousehold: "columnMousehold", onToolbarmouserelease: "columnMouserelease",
				onToolbardragstart: "columnDragStart", onToolbardrag: "columnDrag", onToolbardragfinish: "columnDragFinish"
			};
			if(col.info.type === SPAZ_COLUMN_SEARCH){
				col.kind = "Spaz.SearchColumn";
			}
			if(col.info.type === SPAZ_COLUMN_HOME){
				col.kind = "Spaz.UnifiedColumn";
			}
			if(this.columnData[i].entries){
				col.entries = this.columnData[i].entries;
			}

			cols.push(
				{kind: "Control", name: "ColumnSpacer"+ i, width: "0px", ondragover: "spacerDragOver", ondrop: "spacerDrop", ondragout: "spacerDragOut"},
				col
			);
		};
		cols.push({kind: "Control", name: "ColumnSpacer" + this.columnData.length, width: "0px", ondragover: "spacerDragOver", ondrop: "spacerDrop", ondragout: "spacerDragOut"
		});
		this.$.columnsScroller.createComponents(cols, {owner: this});
		this.$.columnsScroller.render();

		this.saveColumnData();
	},
	createColumn: function(inAccountId, inColumn, inQuery){

		this.columnData.push({type: inColumn, accounts: [inAccountId], query: inQuery, id: _.uniqueId(new Date().getTime())});

		this.saveColumnEntries();
		this.createColumns();

		this.$.columnsScroller.snapTo(this.$.columnsScroller.getControls().length-2);

	},
	saveColumnData: function(){

		var save_cols = [];
		var this_col  = {};

		// copy just the data we want (id, type, accounts, query)
		_.each(this.columnData, function(columnData){
			this_col = {};
			this_col.id = columnData.id;
			this_col.type = columnData.type;
			this_col.accounts = columnData.accounts.slice(0,columnData.accounts.length);
			this_col.query = columnData.query;
			save_cols.push(this_col);
		});

		App.Prefs.set('columns', save_cols);

		this.saveColumnEntries();

	},

	moveColumnLeft: function(inSender){
		this.saveColumnEntries();

		var del_idx = parseInt(inSender.name.replace('Column', ''), 10);
		var column = this.columnData.splice(del_idx, 1)[0];
		this.columnData.splice(del_idx-1, 0, column);

		this.createColumns();
	},
	moveColumnRight: function(inSender){
		this.saveColumnEntries();

		var del_idx = parseInt(inSender.name.replace('Column', ''), 10);
		var column = this.columnData.splice(del_idx, 1)[0];
		this.columnData.splice(del_idx+1, 0, column);

		this.createColumns();
	},
	deleteColumn: function(inSender) {
		this.columnToDelete = inSender;

		this.$.confirmPopup.openAtCenter();
	},
	cancelColumnDeletion: function(inSender) {
		this.$.confirmPopup.close();
		this.columnToDelete = null;
	},
	confirmColumnDeletion: function(inSender) {
		this.$.confirmPopup.close();
		if (this.columnToDelete) {

			// find the index to delete and remove it
			var del_idx = parseInt(this.columnToDelete.name.replace('Column', ''), 10);
			this.columnData.splice(del_idx, 1);

			this.columnToDelete.destroy();
			this.columnToDelete = null;

			this.saveColumnData();

			this.createColumns();
		}
	},
	columnsFunction: function(functionName, opts, sync){
		var columnCount = 0;
		_.each(this.$.columnsScroller.getControls(), function(column){
			try {
				if(column.kind === "Spaz.Column" || column.kind === "Spaz.SearchColumn" || column.kind === "Spaz.UnifiedColumn"){
					columnCount++;
					if(sync) {
						enyo.call(column, functionName, opts);
					}
					else {
						enyo.asyncMethod(column, functionName, opts);
					}
				}
			} catch (e) {
				console.error(e);
			}
		}, this);
		return columnCount;
	},

	refreshAll: function() {
		this.loadingColumns = 0;
		if(this.columnsFunction("loadNewer") === 0) {
			this.loadFinished();
		}
	},

	loadStarted: function() {
		this.loadingColumns++;
	},

	loadFinished: function() {
		this.loadingColumns--;
		if (this.loadingColumns <= 0) {
			this.doRefreshAllFinished();
			AppUI.raiseNotifications();
		}
	},

	search: function(inSender, inQuery){
		this.createColumn(inSender.info.accounts[0], "search", inQuery);
	},

	accountAdded: function(inAccountId) {
		this.columnData = this.columnData.concat(this.getDefaultColumns(inAccountId));
		this.createColumns();
	},

	removeColummnsForAccount: function(inAccountId) {
		var lengthBefore = this.columnData.length;
		for(var i = lengthBefore - 1; i >= 0; i--) {
			//TODO: this needs to be more intelligent when there are multiple accounts in one column.
			if(this.columnData[i].accounts[0] === inAccountId) {
				this.columnData.splice(i, 1);
			}
		}
		if(this.columnData.length !== lengthBefore) {
			this.createColumns();
		}
	},

	removeEntryById: function (inEntryId) {
		this.columnsFunction("removeEntryById", inEntryId);
	},

	saveColumnEntries: function() {
		enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
			if(_.includes(control.kind, "Column") && !_.includes(control.kind, "Spacer")){
				var col_idx = parseInt(control.name.replace('Column', ''), 10);
				this.columnData[col_idx].entries = control.getEntries();
			}
		}));
	},


	spacerDragOver: function(inSender, inEvent){
		if (inEvent.dragInfo !== undefined) {
			enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
				if(_.includes(control.name, "ColumnSpacer")){
					if(control.name !== inSender.name){
						control.applyStyle("width", "10px");
					}
				}
			}));
			inSender.applyStyle("width", "322px");
			//console.error("drug over", inSender.name);
		}
	},
	spacerDragOut: function(inSender, inEvent){
		//inSender.applyStyle("width", "5px");
		//console.error("drug out", inSender.name);
	},
	spacerDrop: function(inSender, inEvent){
		if (inEvent.dragInfo !== undefined) {
			//console.error("Dropped on spacer", inSender.name);

			this.saveColumnEntries();

			var del_idx = parseInt(this.activeColumn.name.replace('Column', ''), 10);
			var new_idx = parseInt(inSender.name.replace('ColumnSpacer', ''), 10);
			if(new_idx > del_idx){
				new_idx--;
			}
			var column = this.columnData.splice(del_idx, 1)[0];
			this.columnData.splice(new_idx, 0, column);

			this.createColumns();
			//@TODO: this creates issues with starting a column drag. To replicate: Hold onto a column toolbar, move it slightly, release. It will float in an awkward postion.
			//this doesn't happen if this.createColumns() is commented out.
		}
	},

	columnMousehold: function(inSender, inEvent){

		this.isHolding = true;
		this.activeColumn = inSender;

		this.$["ColumnSpacer" + this.activeColumn.name.replace('Column', '')].applyStyle("width", "322px");

		this.activeColumn.addClass("moving");
		this.activeColumn.applyStyle("height", window.innerHeight - 12 + "px");


		this.trackColumn(inEvent);
	},
	columnMouserelease: function(inSender, inEvent){
		this.isHolding = false;
		//console.error("mouse release called");
		if(!this.dragColumn){
			//console.error("mouse released");

			this.activeColumn.removeClass("moving");
			this.activeColumn.applyStyle("height", null);

			enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
				if(_.includes(control.name, "ColumnSpacer")){
					control.removeClass("columnSpacer");
					control.applyStyle("width", "0px");
				}
			}));

			this.activeColumn = undefined;
		}
	},

	columnDragStart: function(inSender, inEvent){
		if (Math.abs(inEvent.dx) < 200) { //make sure the user isn't trying to scroll

			if(this.isHolding){
				//console.error("drag start");
				enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
					if(_.includes(control.name, "ColumnSpacer")){
						control.addClass("columnSpacer");
						control.applyStyle("width", "10px");
					}
					if(control.name.replace("ColumnSpacer", "") === this.activeColumn.name.replace('Column', '')){
						control.applyStyle("width", "322px");
						setTimeout(function(){
							control.addClass("columnSpacer");
						}, 300);
					}
				}));


				this.dragColumn = true;
				inEvent.dragInfo = inSender.name;

				this.trackColumn(inEvent);
				return true;
			}
		}
	},
	columnDrag: function(inSender, inEvent){
		if (this.dragColumn) {
			this.trackColumn(inEvent);
			if(window.innerWidth - inEvent.pageX < 100){// && this.$.columnsScroller.node.scrollWidth - this.$.columnsScroller.scrollLeft > 100){
				//console.log(this.$.columnsScroller.getControls().length-2, this.$.columnsScroller.getIndex());
				this.$.columnsScroller.next();
			} else if(inEvent.pageX  < 100){
				this.$.columnsScroller.previous();
			}
		}
	},
	columnDragFinish: function(inSender, inEvent){
		if (this.dragColumn) {
			//console.error("done dragging column");

			this.activeColumn.removeClass("moving");
			this.activeColumn.applyStyle("height", null);

			enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
				if(_.includes(control.name, "ColumnSpacer")){
					control.applyStyle("width", "0px");
					control.removeClass("columnSpacer");
				}
			}));

			this.activeColumn = undefined;
			this.dragColumn = false;

		}
	},
	trackColumn: function(inEvent){
		this.activeColumn.boxToNode({l: this.$.columnsScroller.scrollLeft + inEvent.pageX - 180, t: inEvent.pageY - 20});
	},
	reclaimSpace: function() {
		this.$.columnsScroller.snapTo(this.$.columnsScroller.getIndex());
	}
});
