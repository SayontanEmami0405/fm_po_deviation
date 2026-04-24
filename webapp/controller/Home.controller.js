sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/ButtonType",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../utility/formatter"
], function (Controller, Button, Dialog, Label, MessageToast, Text, TextArea, ButtonType, Filter, FilterOperator, BusyIndicator, MessageBox, Fragment, formatter) {
    "use strict";

    return Controller.extend("fmpodeviation.controller.Home", {
        formatter: formatter,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteApp").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function () {
            // Load Pending data first (Priority 1)
            this.fnGetMyApprovalsData();

            // Delay the others slightly so the server doesn't get overwhelmed
            setTimeout(function () {
                this.fnHistoryApprovedData();
                this.fnHistoryRejectedData();
                this.fnGetUserData();
            }.bind(this), 500);
        },

        onNavBack: function () {
            history.go(-1);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var aItems = ["Ebeln", "Lifnr", "Name1", "Stxt"];
            var aFilters = [];

            if (sQuery && sQuery.length > 0) {
                aItems.forEach(function (sField) {
                    aFilters.push(new Filter(sField, FilterOperator.Contains, sQuery));
                });
                var oFilter = new Filter({
                    filters: aFilters,
                    and: false
                });
                this.byId("approvalsList").getBinding("items").filter(oFilter);
            } else {
                this.byId("approvalsList").getBinding("items").filter([]);
            }
        },

        fnGetMyApprovalsData: function () {
            var that = this;
            var ODataModel = this.getView().getModel();
            if (!this.getView().getModel("jsonMyApprovalsModel")) {
                this.getView().setModel(new sap.ui.model.json.JSONModel(), "jsonMyApprovalsModel");
            }
            BusyIndicator.show();
            ODataModel.read("/PoSet", {
                success: function (oData) {
                    that.getView().getModel("jsonMyApprovalsModel").setData(oData.results);
                    BusyIndicator.hide();
                },
                error: function () {
                    BusyIndicator.hide();
                }
            });
        },

        fnHistoryApprovedData: function () {
            const that = this;
            const ODataModel = this.getView().getModel();
            if (!this.getView().getModel("jsonApprovedModel")) {
                this.getView().setModel(new sap.ui.model.json.JSONModel(), "jsonApprovedModel");
            }
            var aFilters = [new Filter("Status", FilterOperator.EQ, "A")];
            BusyIndicator.show();
            ODataModel.read("/PoSet", {
                filters: aFilters,
                success: function (oSuccess) {
                    that.getView().getModel("jsonApprovedModel").setData(oSuccess.results);
                    BusyIndicator.hide();
                },
                error: function () {
                    BusyIndicator.hide();
                }
            });
        },

        fnHistoryRejectedData: function () {
            const that = this;
            const ODataModel = this.getView().getModel();
            if (!this.getView().getModel("jsonRejectedModel")) {
                this.getView().setModel(new sap.ui.model.json.JSONModel(), "jsonRejectedModel");
            }
            var aFilters = [new Filter("Status", FilterOperator.EQ, "R")];
            BusyIndicator.show();
            ODataModel.read("/PoSet", {
                filters: aFilters,
                success: function (oSuccess) {
                    that.getView().getModel("jsonRejectedModel").setData(oSuccess.results);
                    BusyIndicator.hide();
                },
                error: function () {
                    BusyIndicator.hide();
                }
            });
        },

        onPressLog: function (oEvent) {
            this._showHistoryLog(oEvent, "jsonMyApprovalsModel");
        },
        onPressLogApr: function (oEvent) {
            this._showHistoryLog(oEvent, "jsonApprovedModel");
        },
        onPressLogRej: function (oEvent) {
            this._showHistoryLog(oEvent, "jsonRejectedModel");
        },

        _showHistoryLog: function (oEvent, sModelName) {
            var oItem = oEvent.getSource().getBindingContext(sModelName).getObject();
            var sPO = oItem.Ebeln;
            var that = this;
            var ODataModel = this.getView().getModel();

            var filters = [];

            // First filter
            filters.push(new sap.ui.model.Filter("Ebeln", sap.ui.model.FilterOperator.EQ, sPO))

            // Second filter
            filters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "L"));

            var combinedFilter = new sap.ui.model.Filter({
                filters: filters,
                and: true
            });

            BusyIndicator.show();
            ODataModel.read("/PoSet", {
                filters: [combinedFilter],
                success: function (oSuccess) {
                    BusyIndicator.hide();
                    var aResults = oSuccess.results;

                    if (aResults && aResults.length > 0) {
                        var aLogs = aResults.map(function (record) {
                            var sDate = record.Erdat instanceof Date ? record.Erdat.toLocaleDateString('en-GB') : record.Erdat;
                            var sTime = "00:00:00";
                            if (record.Uzeit && typeof record.Uzeit.ms !== 'undefined') {
                                var time = record.Uzeit.ms;
                                var seconds = Math.floor((time / 1000) % 60).toString().padStart(2, '0');
                                var minutes = Math.floor((time / (1000 * 60)) % 60).toString().padStart(2, '0');
                                var hours = Math.floor((time / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
                                sTime = hours + ":" + minutes + ":" + seconds;
                            }
                            return "---------------------------------\n" +
                                "Date: " + sDate + " | Time: " + sTime + "\n" +
                                "User: " + (record.AddInfo || "N/A") + "\n" +
                                "Comments: " + (record.InitRem || "N/A");
                        });

                        var sLogText = aLogs.join("\n");

                        MessageBox.information(sLogText, {
                            title: "PO History",
                            contentWidth: "400px"
                        });
                    } else {
                        MessageToast.show("No history records found.");
                    }
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("Could not load history.");
                }
            });
        },

        // onPressPrintPlaceholder: function (oEvent) {
        //     var oButton = oEvent.getSource();
        //     var oContext = oButton.getBindingContext("jsonMyApprovalsModel") ||
        //         oButton.getBindingContext("jsonApprovedModel") ||
        //         oButton.getBindingContext("jsonRejectedModel");
        //     if (!oContext) {
        //         MessageToast.show("Could not find PO data for printing.");
        //         return;
        //     }
        //     var sPO = oContext.getProperty("Ebeln");
        //     var sUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/Value";
        //     window.open(sUrl, "_blank");
        // },

        onPressPrintPlaceholder: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext("jsonMyApprovalsModel") ||
                oButton.getBindingContext("jsonApprovedModel") ||
                oButton.getBindingContext("jsonRejectedModel");

            if (!oContext) {
                MessageToast.show("Could not find PO data for printing.");
                return;
            }

            var sPO = oContext.getProperty("Ebeln");
            this._downloadPDF(sPO);
        },

        _downloadPDF: function (sPO) {
            var that = this;
            var oModel = this.getView().getModel();
            var sUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/$value";

            BusyIndicator.show();
            // dataType: "text",
            // CRITICAL: Use OData model's built-in request mechanism
            $.ajax({
                url: sUrl,
                type: "GET",

                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Accept", "application/pdf");
                    xhr.setRequestHeader("DataServiceVersion", "2.0");
                    xhr.setRequestHeader("MaxDataServiceVersion", "2.0");
                    // Add CSRF token if needed
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

                    // Check if we got actual PDF data
                    if (xhr.status === 200) {
                        var blob = new Blob([data], { type: "application/pdf" });

                        var blobUrl = window.URL.createObjectURL(blob);

                        var link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = "PO_" + sPO + ".pdf";

                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        setTimeout(function () {
                            window.URL.revokeObjectURL(blobUrl);
                        }, 1000);

                        MessageToast.show("PDF downloaded successfully");
                    } else {
                        MessageBox.error("Failed to generate PDF. Status: " + xhr.status);
                    }
                },
                error: function (xhr, status, error) {
                    BusyIndicator.hide();
                    console.error("PDF Download Error:", xhr, status, error);

                    // Fallback method 1: Try with different URL format
                    var fallbackUrl = "/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet?$filter=Ebeln eq '" + sPO + "'&$format=json";

                    $.ajax({
                        url: fallbackUrl,
                        type: "GET",
                        dataType: "json",
                        success: function (data) {
                            if (data.d && data.d.results && data.d.results[0]) {
                                var base64Data = data.d.results[0].Value;
                                if (base64Data) {
                                    // Convert base64 to blob
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

                                    setTimeout(function () {
                                        window.URL.revokeObjectURL(blobUrl);
                                    }, 100);
                                }
                            } else {
                                // Last resort: direct window open
                                MessageBox.warning("Trying alternative method...");
                                window.open("/sap/opu/odata/sap/ZFMPODEVIATION_SRV/PrintformSet('" + sPO + "')/$value", "_blank");
                            }
                        },
                        error: function () {
                            MessageBox.error("Could not download PDF. Please try again or contact support.");
                        }
                    });
                }
            });
        },

        onPressAccept: function (oEvent) {
            this._handleAction(oEvent, "A", "jsonMyApprovalsModel");
        },

        onPressUnrelease: function (oEvent) {
            var that = this;
            var oItem = oEvent.getSource().getBindingContext("jsonMyApprovalsModel").getObject();
            var sPO = oItem.Ebeln;
            var ODataModel = this.getView().getModel();

            var aFilters = [
                new Filter("Ebeln", FilterOperator.EQ, sPO),
                new Filter("Status", FilterOperator.EQ, "U")
            ];

            BusyIndicator.show();
            ODataModel.read("/PoSet", {
                filters: aFilters,
                success: function () {
                    BusyIndicator.hide();
                    MessageToast.show("Unreleased Successfully");
                    that.fnGetMyApprovalsData();
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Unrelease failed.");
                }
            });
        },
        onPressReject: function (oEvent) {
            var that = this;
            var oHeader = Object.assign({}, oEvent.getSource().getBindingContext("jsonMyApprovalsModel").getObject());
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
                        oHeader.Action = "R";
                        oHeader.Status = "R";
                        oHeader.AddInfo = sReason;
                        BusyIndicator.show();
                        that.getView().getModel().create("/PoSet", oHeader, {
                            success: function () {
                                BusyIndicator.hide();
                                MessageToast.show("Rejected Successfully");
                                that.fnGetMyApprovalsData();
                            },
                            error: function (oError) {
                                BusyIndicator.hide();
                                try {
                                    var oMsg = JSON.parse(oError.responseText);
                                    MessageBox.error(oMsg.error.message.value);
                                } catch (e) {
                                    MessageBox.error("Action failed.");
                                }
                            }
                        });
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

        _handleAction: function (oEvent, sAction, sModel, sReason) {
            var that = this;
            var oHeader = Object.assign({}, oEvent.getSource().getBindingContext(sModel).getObject());
            oHeader.Action = sAction;
            oHeader.Status = sAction;
            if (sReason) {
                oHeader.AddInfo = sReason;
            }

            BusyIndicator.show();
            this.getView().getModel().create("/PoSet", oHeader, {
                success: function () {
                    BusyIndicator.hide();
                    var sMsg = sAction === "A" ? "Approved Successfully" : (sAction === "U" ? "Unreleased Successfully" : "Action successful");
                    MessageToast.show(sMsg);
                    that.fnGetMyApprovalsData();
                },
                error: function (oError) {
                    BusyIndicator.hide();
                    try {
                        var oMsg = JSON.parse(oError.responseText);
                        MessageBox.error(oMsg.error.message.value);
                    } catch (e) {
                        MessageBox.error("Action failed.");
                    }
                }
            });
        },

        onPressLineItemMyApprovals: function (oEvent) {
            this._navToDetails(oEvent, "jsonMyApprovalsModel", "P");
        },
        onPressLineItemHistoryApproved: function (oEvent) {
            this._navToDetails(oEvent, "jsonApprovedModel", "A");
        },
        onPressLineItemHistoryRejected: function (oEvent) {
            this._navToDetails(oEvent, "jsonRejectedModel", "R");
        },

        _navToDetails: function (oEvent, sModel, sMode) {
            var PO = oEvent.getSource().getBindingContext(sModel).getProperty("Ebeln");
            this.getOwnerComponent().getRouter().navTo("RouteDetails", {
                PO: PO,
                Mode: sMode
            });
        },

        onProfilePress: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._oProfilePopover) {
                Fragment.load({
                    name: "fmpodeviation.view.fragments.ProfilePopover",
                    controller: this
                }).then(function (oPopover) {
                    this._oProfilePopover = oPopover;
                    this.getView().addDependent(this._oProfilePopover);
                    this._oProfilePopover.openBy(oButton);
                }.bind(this));
            } else {
                this._oProfilePopover.openBy(oButton);
            }
        },

        fnGetUserData: function () {
            var that = this;
            if (!this.getView().getModel("jsonUserModel")) {
                this.getView().setModel(new sap.ui.model.json.JSONModel({ Username: "User", Id: "" }), "jsonUserModel");
            }
            this.getView().getModel().read("/UserSet", {
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        that.getView().getModel("jsonUserModel").setData(oData.results[0]);
                    } else {
                        that.fnSetShellUserInfo();
                    }
                },
                error: function () {
                    that.fnSetShellUserInfo();
                }
            });
        },

        fnSetShellUserInfo: function () {
            if (window.sap && sap.ushell && sap.ushell.Container) {
                try {
                    var oUserInfo = sap.ushell.Container.getService("UserInfo").getUser();
                    this.getView().getModel("jsonUserModel").setProperty("/Username", oUserInfo.getFullName() || "User");
                    this.getView().getModel("jsonUserModel").setProperty("/Id", oUserInfo.getId() || "");
                } catch (e) {
                    console.error("User Info Service failed", e);
                }
            }
        },

        onLogoutPress: function () {
            MessageBox.confirm("Logout?", {
                onClose: function (s) {
                    if (s === "OK") window.location.reload();
                }
            });
        },

        onPressHeaderIconTabBar: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "MyApprovals") {
                this.fnGetMyApprovalsData();
            } else if (sKey === "History") {
                this.fnHistoryApprovedData();
            }
        },

        onPressItemIconTabBar: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Approved") {
                this.fnHistoryApprovedData();
            } else if (sKey === "Rejected") {
                this.fnHistoryRejectedData();
            }
        },

        onSearchHistoryApproved: function (oEvent) {
            this._handleHistorySearch(oEvent, "approvedList");
        },

        onSearchHistoryRejected: function (oEvent) {
            this._handleHistorySearch(oEvent, "rejectedList");
        },

        _handleHistorySearch: function (oEvent, sListId) {
            var sQuery = oEvent.getParameter("newValue");
            var aItems = ["Ebeln", "Lifnr", "Name1"];
            var aFilters = [];
            if (sQuery) {
                aItems.forEach(function (sField) {
                    aFilters.push(new Filter(sField, FilterOperator.Contains, sQuery));
                });
                this.byId(sListId).getBinding("items").filter(new Filter({ filters: aFilters, and: false }));
            } else {
                this.byId(sListId).getBinding("items").filter([]);
            }
        }
    });
});


