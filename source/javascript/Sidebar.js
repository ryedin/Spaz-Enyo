enyo.kind({
	name: "Spaz.Sidebar",
	width: "50px",
	kind: "VFlexBox",
	className: "enyo-toolbar-vertical",
	components: [
		{kind: "ToolButton", icon: "source/images/icon-compose.png", onclick: "openPopup", popup:"composePopup"},
		{kind: "ToolButton", icon: "source/images/icon-new-column.png"},
		{kind: "ToolButton", icon: "source/images/icon-search.png"},
		{kind: "Spacer"},
		{kind: "ToolButton", icon: "source/images/icon-settings.png", onclick: "openPopup", popup:"settingsPopup"},
		{name: "composePopup", kind: "Spaz.ComposePopup", onClose: "closePopup" },
		{name: "settingsPopup", kind: "Spaz.SettingsPopup", onClose: "closePopup" }
	],
	openPopup: function(inSender) {
		// inSender is the component that triggers this; .popup is the property in the def above
		var popup = this.$[inSender.popup]; // find the component with the passed name
		if (popup) {
			popup.openAtCenter();
		}	
	},
	closePopup: function(inSender) {
		inSender.close();
	}
});