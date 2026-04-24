sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator",
    "../utility/formatter",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/ButtonType",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, BusyIndicator, formatter, Button, Dialog, Label, MessageToast, Text, TextArea, ButtonType, MessageBox) {
    "use strict";

    return Controller.extend("fmpodeviation.controller.Details", {
        formatter: formatter,
        onInit: function () {
            this.getView().setModel(new sap.ui.model.json.JSONModel(), "jsonItemListModel");
            this.getView().setModel(new sap.ui.model.json.JSONModel(), "jsonHeaderModel");
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                buttonsEnabled: true
            }), "jsonUiModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetails").attachPatternMatched(this._onObjectMatched, this);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteApp", {}, true);
        },

        onToggleExpandAll: function (oEvent) {
            var oButton = oEvent.getSource();
            var bExpanded = this._bAllExpanded || false;
            var oList = this.byId("idItemList");
            var aItems = oList.getItems();

            this._bAllExpanded = !bExpanded;

            aItems.forEach(function (oItem) {
                var oPanel = oItem.getContent()[0];
                if (oPanel && oPanel.setExpanded) {
                    oPanel.setExpanded(!bExpanded);
                }
            });

            // Update icon to reflect next action
            oButton.setIcon(!bExpanded ? "https://img.icons8.com/color/48/collapse-arrow.png" : "https://img.icons8.com/color/48/expand-arrow.png");
        },

        _onObjectMatched: function (oEvent) {
            var PO = oEvent.getParameter("arguments").PO;
            var Mode = oEvent.getParameter("arguments").Mode;

            // PRE-SET UI STATE: Hide buttons immediately if Mode is History
            var bVisible = false;
            this.getView().getModel("jsonUiModel").setProperty("/buttonsEnabled", bVisible);

            this._PO = PO;
            this._loadData(PO, Mode);
        },

        _loadData: function (PO, Mode) {
            var that = this;
            var ODataModel = this.getView().getModel();

            var aFilters = [
                new Filter("Ebeln", FilterOperator.EQ, PO)
            ];

            BusyIndicator.show();

            ODataModel.read("/PoSet", {
                filters: aFilters,
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        var oHeader = oData.results.find(function (item) {
                            return item.Ebelp === "00000";
                        }) || oData.results[0];

                        var aItems = oData.results.filter(function (item) {
                            return item.Ebelp !== "00000";
                        });

                        that.getView().getModel("jsonItemListModel").setData(aItems);

                        var oHeaderModel = that.getView().getModel("jsonHeaderModel");
                        oHeaderModel.setData(oHeader);

                        var sStatusText, sStatusState;

                        if (Mode === "P") {
                            sStatusText = "Pending Approval";
                            sStatusState = "Warning";
                        } else if (Mode === "A") {
                            sStatusText = "Approved";
                            sStatusState = "Success";
                        } else if (Mode === "R") {
                            sStatusText = "Rejected";
                            sStatusState = "Error";
                        } else {
                            // Fallback for any other case
                            var bIsApproved = (oHeader.Status === "A" || oHeader.Loekz === true);
                            sStatusText = bIsApproved ? "Approved" : "Rejected";
                            sStatusState = bIsApproved ? "Success" : "Error";
                        }

                        oHeaderModel.setProperty("/statusText", sStatusText);
                        oHeaderModel.setProperty("/statusState", sStatusState);

                        oHeaderModel.updateBindings(true);
                    }
                    BusyIndicator.hide();
                },
                error: function () {
                    BusyIndicator.hide();
                }
            });
        },

        onPressAccept: function () {
            this.fnHandleAction("A");
        },

        onPressReject: function () {
            var that = this;
            var oTextArea = new TextArea({
                width: "100%",
                placeholder: "Enter rejection reason...",
                rows: 4
            });
            var oDialog = new Dialog({
                title: "Reject Reason",
                type: "Message",
                content: [
                    new Label({ text: "Please enter the reason for rejection:" }),
                    oTextArea
                ],
                beginButton: new Button({
                    text: "Reject",
                    type: ButtonType.Reject,
                    press: function () {
                        var sReason = oTextArea.getValue().trim();
                        if (!sReason) {
                            MessageToast.show("Please enter a rejection reason.");
                            return;
                        }
                        oDialog.close();
                        that.fnHandleAction("R", sReason);
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });
            oDialog.open();
        },

        fnHandleAction: function (sAction, sReason) {
            var that = this;
            var oHeader = Object.assign({}, this.getView().getModel("jsonHeaderModel").getData());

            // Cleanup UI-only properties before sending to OData
            // UI properties are now in jsonUiModel, so jsonHeaderModel is clean

            oHeader.Action = sAction;
            oHeader.Status = sAction;
            if (sReason) {
                oHeader.AddInfo = sReason;
            }

            BusyIndicator.show();
            this.getView().getModel().create("/PoSet", oHeader, {
                success: function () {
                    BusyIndicator.hide();
                    MessageToast.show(sAction === "A" ? "Approved Successfully" : "Rejected Successfully");
                    that.getOwnerComponent().getRouter().navTo("RouteApp");
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    try {
                        var oMsg = JSON.parse(oError.responseText);
                        MessageBox.error(oMsg.error.message.value);
                    } catch (e) {
                        MessageBox.error("Action failed. Please try again.");
                    }
                }
            });
        },

        // onPressPrintPlaceholder: function () {
        //     var oData = this.getView().getModel("jsonHeaderModel").getData();
        //     var sPO = oData ? oData.Ebeln : null;

        //     if (!sPO) {
        //         MessageToast.show("PO number not found.");
        //         return;
        //     }

        //     var sUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/$value";
        //     window.open(sUrl, "_blank");
        // }

        onPressPrintPlaceholder: function () {
            var oData = this.getView().getModel("jsonHeaderModel").getData();
            var sPO = oData ? oData.Ebeln : null;

            if (!sPO) {
                MessageToast.show("PO number not found.");
                return;
            }

            var that = this;
            var oModel = this.getView().getModel();
            var sUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/$value";

            BusyIndicator.show();

            $.ajax({
                url: sUrl,
                type: "GET",
                dataType: "text",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Accept", "application/pdf");
                    xhr.setRequestHeader("DataServiceVersion", "2.0");
                    xhr.setRequestHeader("MaxDataServiceVersion", "2.0");
                    var token = oModel.getSecurityToken();
                    if (token) {
                        xhr.setRequestHeader("X-CSRF-Token", token);
                    }
                },
                xhrFields: {
                    responseType: 'arraybuffer'
                },
                success: function (data, status, xhr) {
                    BusyIndicator.hide();

                    if (xhr.status === 200) {
                        var blob = new Blob([data], { type: "application/pdf" });
                        var blobUrl = window.URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = "PO_" + sPO + ".pdf";
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        setTimeout(function () {
                            window.URL.revokeObjectURL(blobUrl);
                        }, 100);
                    }
                },
                error: function (xhr, status, error) {
                    BusyIndicator.hide();

                    var fallbackUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet?$filter=Ebeln eq '" + sPO + "'&$format=json";

                    $.ajax({
                        url: fallbackUrl,
                        type: "GET",
                        dataType: "json",
                        success: function (data) {
                            if (data.d && data.d.results && data.d.results[0] && data.d.results[0].Value) {
                                var base64Data = data.d.results[0].Value;
                                var byteCharacters = atob(base64Data);
                                var byteNumbers = new Array(byteCharacters.length);
                                for (var i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                var byteArray = new Uint8Array(byteNumbers);
                                var blob = new Blob([byteArray], { type: "application/pdf" });
                                var blobUrl = window.URL.createObjectURL(blob);
                                var link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = "PO_" + sPO + ".pdf";
                                link.target = "_blank";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(function () { window.URL.revokeObjectURL(blobUrl); }, 100);
                            } else {
                                window.open("/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/$value", "_blank");
                            }
                        },
                        error: function () {
                            MessageBox.error("Could not download PDF. Please try again.");
                        }
                    });
                }
            });
        }
    });
});
