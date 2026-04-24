sap.ui.define([], () => {
	"use strict";

	return {

		formatCardDateTime: function (oErdat, oUzeit) {
			var sDate = "";
			if (oErdat) {
				try { sDate = new Date(oErdat).toLocaleDateString("en-GB"); } catch (e) { }
			}
			var sTime = "";
			if (oUzeit) {
				if (typeof oUzeit === "string" && oUzeit.startsWith("PT")) {
					var match = oUzeit.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
					if (match) {
						sTime = (match[1] || "0").padStart(2, "0") + ":" + (match[2] || "0").padStart(2, "0") + ":" + (match[3] || "0").padStart(2, "0");
					}
				} else if (oUzeit.ms !== undefined) {
					var ms = oUzeit.ms;
					sTime = String(Math.floor(ms / 3600000)).padStart(2, "0") + ":" + String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0") + ":" + String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
				}
			}
			return "Date : " + sDate + " - Time : " + sTime;
		},

		headerText: function (ebelp, Stxt, netwr, waers, loekz) {

			ebelp = ebelp || "";
			waers = waers || "";

			var sAmount = "";
			if (netwr) {
				var fValue = parseFloat(netwr);
				if (!isNaN(fValue)) {
					// Use direct Intl call to avoid 'this' context errors
					var sFormatted = new Intl.NumberFormat('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					}).format(fValue);
					sAmount = (waers || "INR") + " " + sFormatted;
				} else {
					sAmount = (waers || "INR") + " " + netwr;
				}
			}

			var sStatus = "";
			if (loekz === true || loekz === "X") {
				sStatus = " - Deleted line";
			}

			return `${ebelp} - ${Stxt} - ${sAmount}${sStatus}`;
		},

		formatDate: function (v) {
			if (!v) return "";
			var d = new Date(v);
			return d.toLocaleDateString("en-GB");
		},

		formatIndianNumber: function (sValue) {
			if (!sValue) return "";
			var fValue = parseFloat(sValue);
			if (isNaN(fValue)) return sValue;

			// Force 'en-IN' for lakhs/crores format
			return new Intl.NumberFormat('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(fValue);
		},

		formatIndianCurrency: function (sWaers, sNetwr) {
			if (!sNetwr) return "";
			var fValue = parseFloat(sNetwr);
			if (isNaN(fValue)) return sNetwr;
			var sFormatted = new Intl.NumberFormat('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(fValue);
			return (sWaers || "INR") + " " + sFormatted;
		},

		formatReleaseStatus: function (sValue) {
			if (sValue === "R") {
				return "Released";
			} else if (sValue === "U") {
				return "Unreleased";
			}
			return "Unreleased"; // fallbacks
		},

		formatReleaseStatusState: function (sValue) {
			if (sValue === "R") {
				return "Success";
			} else if (sValue === "U") {
				return "Error";
			}
			return "Error"; // fallbacks
		}
	};
});