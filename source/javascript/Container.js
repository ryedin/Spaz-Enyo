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
	columnEntries: [],
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
			{type: SPAZ_COLUMN_HOME, accounts: [inAccountId]},
			{type: SPAZ_COLUMN_MENTIONS, accounts: [inAccountId]},
			{type: SPAZ_COLUMN_MESSAGES, accounts: [inAccountId]}
		];

		return default_columns;
	},
	
	createColumns: function() {
		this.columnsFunction("destroy", null, true); //destroy them all. don't want to always do this.

		if(this.columnData.length === 0){
			this.columnData = this.getDefaultColumns();
		}
		var cols = [];

		for (var i = 0; i < this.columnData.length; i++) {
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
			if(this.columnEntries[i]) {
				col.entries = this.columnEntries[i];
			}
	
			cols.push(
				{kind: "Control", name: "ColumnSpacer"+ i, width: "0px", ondragover: "spacerDragOver", ondrop: "spacerDrop", ondragout: "spacerDragOut"},
				col
			);
		};
		cols.push({kind: "Control", name: "ColumnSpacer" + cols.length-1, width: "0px", ondragover: "spacerDragOver", ondrop: "spacerDrop", ondragout: "spacerDragOut"
		});
		this.$.columnsScroller.createComponents(cols, {owner: this});
		this.$.columnsScroller.render();
		this.columnEntries = [];
		
		App.Prefs.set('columns', this.columnData);		
	},
	createColumn: function(inAccountId, inColumn, inQuery){
		
		var colattr = {type: inColumn, accounts: [inAccountId], query: inQuery };
		
		this.columnData.push({type: inColumn, accounts: [inAccountId], query: inQuery});

		this.saveColumnEntries();
		this.createColumns();

		this.$.columnsScroller.snapTo(this.columnData.length-1);

	},

	moveColumnLeft: function(inSender){
		this.saveColumnEntries();
		
		var del_idx = parseInt(inSender.name.replace('Column', ''), 10);
		var column = this.columnData.splice(del_idx, 1)[0];
		var entries = this.columnEntries.splice(del_idx, 1)[0];
		this.columnData.splice(del_idx-1, 0, column);
		this.columnEntries.splice(del_idx-1, 0, entries);
		
		this.createColumns();
	},
	moveColumnRight: function(inSender){
		this.saveColumnEntries();
		
		var del_idx = parseInt(inSender.name.replace('Column', ''), 10);
		var column = this.columnData.splice(del_idx, 1)[0];
		var entries = this.columnEntries.splice(del_idx, 1)[0];
		this.columnData.splice(del_idx+1, 0, column);
		this.columnEntries.splice(del_idx+1, 0, entries);
		
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

			// save the column set
			App.Prefs.set('columns', this.columnData);

			this.columnToDelete.destroy();
			this.columnToDelete = null;

			this.saveColumnEntries();
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
		this.columnEntries = [];
		enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
			if(_.includes(control.kind, "Column") && !_.includes(control.kind, "Spacer")){
				var col_idx = parseInt(control.name.replace('Column', ''), 10);
				this.columnEntries[col_idx] = control.getEntries();
			}
		}));
	},


	spacerDragOver: function(inSender, inEvent){
		enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
			if(_.includes(control.name, "ColumnSpacer")){
				if(control.name !== inSender.name){
					control.applyStyle("width", "20px");
				}
			}
		}));
		inSender.applyStyle("width", "200px");
		this.activeSpacer = inSender.name;
		console.error("XXXXXX drug over", inSender.name);	
	},
	spacerDragOut: function(inSender, inEvent){
		//inSender.applyStyle("width", "20px");
		//console.error("drug out", inSender.name);
	},
	spacerDrop: function(inSender, inEvent){
		console.error("Dropped on spacer", inSender.name);
	},

	columnMousehold: function(inSender, inEvent){

		this.isHolding = true;
		this.activeColumn = inSender;
		this.activeColumn.applyStyle("position", "absolute");
		this.activeColumn.applyStyle("z-index", 50000);
		this.activeColumn.applyStyle("-webkit-user-drag", "none");
		this.activeColumn.applyStyle("pointer-events", "none");

		this.trackColumn(inEvent);

		console.error("column mouseheld", inSender.name);
	},
	columnMouserelease: function(inSender, inEvent){
		this.isHolding = false;
		if(!this.dragColumn){
			this.activeColumn.applyStyle("position", null);
			this.activeColumn.applyStyle("z-index", null);
			this.activeColumn.applyStyle("-webkit-user-drag", null);
			this.activeColumn.applyStyle("pointer-events", null);

			this.activeColumn = undefined;	
		}
		console.error("column mousereleased", inSender.name);		
	},

	columnDragStart: function(inSender, inEvent){
		if (Math.abs(inEvent.dx) < 200) { //make sure the user isn't trying to scroll

			if(this.isHolding){

				this.activeSpacer = "ColumnSpacer" + inSender.name.replace('Column', '');

				console.error("column drag start", inSender.name);

				enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
					if(_.includes(control.name, "ColumnSpacer")){
						control.applyStyle("width", "20px");
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
		console.error("dragging column", inSender.name);	

		if (this.dragColumn) {
			this.trackColumn(inEvent);
		}
	},
	columnDragFinish: function(inSender, inEvent){
		console.error("done dragging column", inSender.name);

		if (this.dragColumn) {
			this.activeColumn.applyStyle("position", null);
			this.activeColumn.applyStyle("z-index", null);
			this.activeColumn.applyStyle("-webkit-user-drag", null);
			this.activeColumn.applyStyle("pointer-events", null);

			enyo.forEach(this.$.columnsScroller.getControls(), enyo.bind(this, function(control) {
				if(_.includes(control.name, "ColumnSpacer")){
					control.applyStyle("width", "0px");
				}
			}));
		

			this.saveColumnEntries();
		
			var del_idx = parseInt(this.activeColumn.name.replace('Column', ''), 10);
			var new_idx = parseInt(this.activeSpacer.replace('ColumnSpacer', ''), 10);
			var column = this.columnData.splice(del_idx, 1)[0];
			var entries = this.columnEntries.splice(del_idx, 1)[0];
			this.columnData.splice(new_idx, 0, column);
			this.columnEntries.splice(new_idx, 0, entries);
			
			this.createColumns();

			this.activeSpacer = undefined;
			this.activeColumn = undefined;


		}
	},
	trackColumn: function(inEvent){
		this.activeColumn.boxToNode({l: inEvent.pageX - 180, t: inEvent.pageY - 20});
	}
});
